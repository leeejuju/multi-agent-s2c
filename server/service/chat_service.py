import json
from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents import agent_manager
from src.database import Conversation, Message
from src.database.repositories import ConversationRepository
from src.utils import logger

from .langfuse_service import (
    with_langfuse_config,
)


async def get_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Conversation:
    repository = ConversationRepository(session=db)
    conversation = await repository.get_by_id_for_user(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation


async def list_conversations(
    db: AsyncSession,
    user_id: str,
) -> list[Conversation]:
    repository = ConversationRepository(session=db)
    return await repository.list_by_user(user_id)


def _attachment_value(attachment: Any, key: str, default: Any = None) -> Any:
    if isinstance(attachment, Mapping):
        return attachment.get(key, default)
    return getattr(attachment, key, default)


def _serialize_attachment_for_init(attachment: Any) -> dict[str, Any]:
    return {
        "id": _attachment_value(attachment, "id", ""),
        "file_name": _attachment_value(attachment, "file_name", "Attachment"),
        "content_type": _attachment_value(
            attachment,
            "content_type",
            "application/octet-stream",
        ),
        "file_size": _attachment_value(attachment, "file_size"),
        "object_key": _attachment_value(attachment, "object_key"),
        "category": _attachment_value(attachment, "category"),
        "access_url": _attachment_value(attachment, "access_url", ""),
        "thumb_url": _attachment_value(attachment, "thumb_url"),
        "parser": _attachment_value(attachment, "parser"),
        "parse_status": _attachment_value(attachment, "parse_status"),
        "parse_error": _attachment_value(attachment, "parse_error"),
    }


def stream_chunk(
    db: AsyncSession,
    *,
    agent_id: str,
    input_text: str,
    conversation_id: str | None,
    user_id: str,
    attachments: Sequence[Any] | None = None,
    request_config: Mapping[str, Any] | None = None,
) -> AsyncIterator[bytes]:
    meta: dict[str, Any] = {"request_id": None}
    repository = ConversationRepository(session=db)

    def generator_chunk(content: str | None = None, **kwargs: Any) -> bytes:
        return (
            json.dumps(
                {
                    "request_id": meta.get("request_id"),
                    "response": content,
                    **kwargs,
                },
                ensure_ascii=False,
                default=str,
            ).encode("utf-8")
            + b"\n"
        )

    def iter_tool_activities(value: Any):
        if isinstance(value, Mapping):
            activities = value.get("tool_activities")
            if isinstance(activities, Mapping):
                for activity in activities.values():
                    if isinstance(activity, Mapping):
                        yield activity
            for nested in value.values():
                yield from iter_tool_activities(nested)
        elif isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            for item in value:
                yield from iter_tool_activities(item)

    try:
        agent = agent_manager.get_agent(agent_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found: {agent_id}",
        ) from exc

    async def chunk_generator() -> AsyncIterator[bytes]:
        resolved_conversation_id = conversation_id
        full_content = ""
        try:
            resolved_conversation_id, user_message = await repository.save_message(
                "user",
                input_text,
                conversation_id=conversation_id,
                user_id=user_id,
            )
            await repository.commit()
            meta.update(
                {
                    "request_id": resolved_conversation_id,
                    "conversation_id": resolved_conversation_id,
                }
            )

            attachment_payloads = [
                _serialize_attachment_for_init(attachment)
                for attachment in attachments or []
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

            yield generator_chunk(
                status="init",
                type="metadata",
                meta=meta,
                msg=init_msg,
                conversation_id=resolved_conversation_id,
            )

            attachment_count = len(attachments or [])
            langfuse_config = with_langfuse_config(
                user_id=user_id,
                conversation_id=resolved_conversation_id,
                agent_id=agent_id,
                user_message_id=str(user_message.id),
                message_type=message_type,
                attachment_count=attachment_count,
                request_config=dict(request_config or {}),
            )

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
                    "configurable": {"thread_id": resolved_conversation_id},
                    **langfuse_config,
                },
            ):
                if mode in {"updates", "values"}:
                    for activity in iter_tool_activities(chunk):
                        yield generator_chunk(
                            status=activity.get("status", "updated"),
                            type="tool",
                            tool_call_id=activity.get("tool_call_id", "tool_call"),
                            tool_name=activity.get("tool_name", "tool_call"),
                            title=activity.get("title"),
                            query=activity.get("query"),
                            source=activity.get("source"),
                            search_scope=activity.get("search_scope"),
                            search_scopes=activity.get("search_scopes"),
                            result_items=activity.get("result_items"),
                            result_count=activity.get("result_count"),
                            conversation_id=resolved_conversation_id,
                        )
                    continue

                if mode != "messages":
                    continue

                token = chunk.content
                if not token:
                    continue

                full_content += token
                yield generator_chunk(
                    token,
                    status="stream",
                    type="token",
                    conversation_id=resolved_conversation_id,
                )

            await repository.save_message(
                "assistant",
                full_content,
                conversation_id=resolved_conversation_id,
            )
            await repository.commit()
            yield generator_chunk(
                status="done",
                type="done",
                conversation_id=resolved_conversation_id,
            )
        except Exception:
            await repository.rollback()
            logger.exception(
                "Streaming chat failed: user_id=%s, conversation_id=%s.",
                user_id,
                resolved_conversation_id,
            )
            yield generator_chunk(
                status="error",
                type="error",
                message="Streaming response failed.",
                conversation_id=resolved_conversation_id,
            )

    return chunk_generator()


async def get_messages(
    db: AsyncSession,
    conversation_id: str,
) -> list[Message]:
    repository = ConversationRepository(db)
    return await repository.get_messages(conversation_id)


async def delete_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> None:
    repository = ConversationRepository(db)
    deleted = await repository.delete_by_id_for_user(conversation_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    await repository.commit()
