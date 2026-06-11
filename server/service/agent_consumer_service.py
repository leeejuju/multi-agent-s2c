from collections.abc import Mapping, Sequence
from typing import Any

from src.agents import agent_manager
from src.database import session_context
from src.database.repositories import ConversationRepository, RunRepository
from src.utils import logger

from .agent_queue_service import (
    agent_stream_enabled,
    get_redis_client,
    publish_run_event,
    serialize_attachment_for_chat,
)
from .langfuse_service import with_langfuse_config


def _build_agent_input(
    input_text: str,
    attachments: Sequence[Any] | None = None,
) -> tuple[str | list[dict[str, Any]], dict[str, Any], str]:
    attachment_payloads = [
        serialize_attachment_for_chat(attachment) for attachment in attachments or []
    ]
    image_urls = [
        attachment["access_url"]
        for attachment in attachment_payloads
        if str(attachment.get("content_type") or "").startswith("image/")
        and attachment.get("access_url")
    ]
    has_documents = any(
        (attachment.get("category") == "document")
        or not str(attachment.get("content_type") or "").startswith("image/")
        for attachment in attachment_payloads
    )
    if image_urls and has_documents:
        message_type = "multimodal_attachment"
    elif image_urls:
        message_type = "multimodal_image"
    elif has_documents:
        message_type = "document"
    else:
        message_type = "text"

    init_msg: dict[str, Any] = {
        "role": "user",
        "content": input_text,
        "type": "human",
        "message_type": message_type,
    }
    if attachment_payloads:
        init_msg["attachments"] = attachment_payloads

    if image_urls:
        init_msg["image_content"] = image_urls
        messages: str | list[dict[str, Any]] = [
            {"type": "text", "text": input_text},
            *[
                {"type": "image_url", "image_url": {"url": image_url}}
                for image_url in image_urls
            ],
        ]
    else:
        messages = input_text

    return messages, init_msg, message_type


def _iter_tool_activities(value: Any):
    if isinstance(value, Mapping):
        activities = value.get("tool_activities")
        if isinstance(activities, Mapping):
            for activity in activities.values():
                if isinstance(activity, Mapping):
                    yield activity
        for nested in value.values():
            yield from _iter_tool_activities(nested)
    elif isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        for item in value:
            yield from _iter_tool_activities(item)


async def execute_agent_run(run_id: str) -> None:
    async with session_context() as session:
        run_repository = RunRepository(session)
        conversation_repository = ConversationRepository(session)
        run = await run_repository.get_by_id(run_id)
        if run is None:
            logger.warning("Agent run not found: run_id=%s.", run_id)
            return

        if run.status == "canceling":
            await run_repository.set_status(run, "canceled")
            await conversation_repository.update_message_content(
                str(run.assistant_message_id),
                "",
                status="canceled",
            )
            await run_repository.commit()
            return

        await run_repository.set_status(run, "running")
        await conversation_repository.update_message_content(
            str(run.assistant_message_id),
            "",
            status="streaming",
        )
        await run_repository.commit()

        attachments = list((run.attachments or {}).get("items", []))
        messages, init_msg, message_type = _build_agent_input(run.input_text, attachments)
        attachment_count = len(attachments)
        redis = get_redis_client() if agent_stream_enabled(run.request_config) else None

        try:
            agent = agent_manager.get_agent(run.agent_id)
        except KeyError as exc:
            await _fail_run(run_id, f"Agent not found: {run.agent_id}")
            raise RuntimeError(f"Agent not found: {run.agent_id}") from exc

        await publish_run_event(
            session,
            redis,
            run_id=run_id,
            event_type="metadata",
            payload={
                "status": "init",
                "type": "metadata",
                "msg": init_msg,
                "conversation_id": str(run.conversation_id),
                "message_id": str(run.assistant_message_id),
            },
            request_config=run.request_config,
        )

        langfuse_config = with_langfuse_config(
            user_id=str(run.user_id),
            conversation_id=str(run.conversation_id),
            agent_id=run.agent_id,
            user_message_id=str(run.user_message_id),
            message_type=message_type,
            attachment_count=attachment_count,
            request_config=dict(run.request_config or {}),
        )
        thread_id = str(run.conversation_id)
        uid = str(run.user_id)

        try:
            async for mode, chunk in agent.stream_messages(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": messages,
                        }
                    ]
                },
                config={
                    "configurable": {
                        "thread_id": thread_id,
                        "uid": uid,
                    },
                    **langfuse_config,
                },
            ):
                await session.refresh(run)
                if run.status == "canceling":
                    await run_repository.set_status(run, "canceled")
                    await conversation_repository.set_message_status(
                        str(run.assistant_message_id),
                        "canceled",
                    )
                    await run_repository.commit()
                    await publish_run_event(
                        session,
                        redis,
                        run_id=run_id,
                        event_type="done",
                        payload={
                            "status": "canceled",
                            "type": "done",
                            "conversation_id": str(run.conversation_id),
                        },
                        request_config=run.request_config,
                    )
                    return

                if mode in {"updates", "values"}:
                    await _publish_tool_events(session, redis, run_id, run, chunk)
                    continue

                if mode != "messages":
                    continue

                token = getattr(chunk, "content", "")
                if not token:
                    continue

                await conversation_repository.append_message_content(
                    str(run.assistant_message_id),
                    str(token),
                    status="streaming",
                )
                await publish_run_event(
                    session,
                    redis,
                    run_id=run_id,
                    event_type="token",
                    payload={
                        "response": str(token),
                        "status": "stream",
                        "type": "token",
                        "conversation_id": str(run.conversation_id),
                        "message_id": str(run.assistant_message_id),
                    },
                    request_config=run.request_config,
                )

            await run_repository.set_status(run, "completed")
            await conversation_repository.set_message_status(
                str(run.assistant_message_id),
                "completed",
            )
            await run_repository.commit()
            await publish_run_event(
                session,
                redis,
                run_id=run_id,
                event_type="done",
                payload={
                    "status": "done",
                    "type": "done",
                    "conversation_id": str(run.conversation_id),
                    "message_id": str(run.assistant_message_id),
                },
                request_config=run.request_config,
            )
        except Exception as exc:
            logger.exception("Agent run failed: run_id=%s.", run_id)
            await run_repository.set_status(run, "failed", error=str(exc))
            await conversation_repository.set_message_status(
                str(run.assistant_message_id),
                "failed",
            )
            await run_repository.commit()
            await publish_run_event(
                session,
                redis,
                run_id=run_id,
                event_type="error",
                payload={
                    "status": "error",
                    "type": "error",
                    "message": "Streaming response failed.",
                    "conversation_id": str(run.conversation_id),
                    "message_id": str(run.assistant_message_id),
                },
                request_config=run.request_config,
            )
            raise


async def _publish_tool_events(
    session,
    redis,
    run_id: str,
    run,
    chunk: Any,
) -> None:
    for activity in _iter_tool_activities(chunk):
        await publish_run_event(
            session,
            redis,
            run_id=run_id,
            event_type="tool",
            payload={
                "status": activity.get("status", "updated"),
                "type": "tool",
                "tool_call_id": activity.get("tool_call_id", "tool_call"),
                "tool_name": activity.get("tool_name", "tool_call"),
                "title": activity.get("title"),
                "query": activity.get("query"),
                "source": activity.get("source"),
                "search_scope": activity.get("search_scope"),
                "search_scopes": activity.get("search_scopes"),
                "result_items": activity.get("result_items"),
                "result_count": activity.get("result_count"),
                "conversation_id": str(run.conversation_id),
                "message_id": str(run.assistant_message_id),
            },
            request_config=run.request_config,
        )


async def _fail_run(run_id: str, message: str) -> None:
    async with session_context() as session:
        run_repository = RunRepository(session)
        conversation_repository = ConversationRepository(session)
        run = await run_repository.get_by_id(run_id)
        if run is None:
            return
        redis = get_redis_client() if agent_stream_enabled(run.request_config) else None
        await run_repository.set_status(run, "failed", error=message)
        await conversation_repository.update_message_content(
            str(run.assistant_message_id),
            "",
            status="failed",
        )
        await run_repository.commit()
        await publish_run_event(
            session,
            redis,
            run_id=run_id,
            event_type="error",
            payload={
                "status": "error",
                "type": "error",
                "message": message,
                "conversation_id": str(run.conversation_id),
                "message_id": str(run.assistant_message_id),
            },
            request_config=run.request_config,
        )
