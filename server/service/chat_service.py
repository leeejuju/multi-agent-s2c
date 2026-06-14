import asyncio
import json
from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents import agent_manager
from src.configs import config
from src.database import Conversation, Message
from src.database.models import AgentRun
from src.database.repositories import ConversationRepository, RunRepository
from src.utils import logger

from .agent_consumer_service import execute_agent_run
from .agent_queue_service import (
    agent_event_persist_enabled,
    agent_queue_enabled,
    agent_stream_enabled,
    get_arq_pool,
    get_redis_client,
    iter_persisted_run_events,
    json_line_event,
    run_stream_key,
)
from .conversation_service import prepare_attachments_for_conversation


async def _execute_agent_run_locally(run_id: str) -> None:
    try:
        await execute_agent_run(run_id)
    except Exception:
        logger.exception("Local agent run task failed: run_id=%s.", run_id)


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


async def create_agent_run(
    db: AsyncSession,
    *,
    agent_id: str,
    input_text: str,
    conversation_id: str | None,
    user_id: str,
    attachments: Sequence[Any] | None = None,
    request_config: Mapping[str, Any] | None = None,
) -> AgentRun:
    try:
        agent_manager.get_agent(agent_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found: {agent_id}",
        ) from exc

    conversation_repository = ConversationRepository(session=db)
    run_repository = RunRepository(session=db)
    if conversation_id is not None:
        conversation = await conversation_repository.get_by_id_for_user(
            conversation_id,
            user_id,
        )
        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )
        active_run = await run_repository.get_active_for_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
        )
        if active_run is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This conversation already has a running agent response.",
            )

    resolved_conversation_id, user_message = await conversation_repository.save_message(
        "user",
        input_text,
        conversation_id=conversation_id,
        user_id=user_id,
        status="completed",
    )
    active_run = await run_repository.get_active_for_conversation(
        conversation_id=resolved_conversation_id,
        user_id=user_id,
    )
    if active_run is not None:
        await conversation_repository.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This conversation already has a running agent response.",
        )

    normalized_attachments = await prepare_attachments_for_conversation(
        db,
        user_id=user_id,
        conversation_id=resolved_conversation_id,
        attachments=attachments,
    )

    _, assistant_message = await conversation_repository.save_message(
        "assistant",
        "",
        conversation_id=resolved_conversation_id,
        status="streaming",
    )
    run = await run_repository.create_run(
        conversation_id=resolved_conversation_id,
        user_id=user_id,
        user_message_id=str(user_message.id),
        assistant_message_id=str(assistant_message.id),
        agent_id=agent_id,
        input_text=input_text,
        attachments=normalized_attachments,
        request_config=dict(request_config or {}),
    )
    await run_repository.commit()

    if agent_queue_enabled(request_config):
        try:
            arq = await get_arq_pool()
            job = await arq.enqueue_job("run_agent", str(run.id), _job_id=str(run.id))
            if job is None:
                raise RuntimeError("Agent run job was not enqueued.")
        except Exception as exc:
            logger.exception("Failed to enqueue agent run: run_id=%s.", run.id)
            await run_repository.set_status(run, "failed", error=str(exc))
            await conversation_repository.set_message_status(
                str(assistant_message.id),
                "failed",
            )
            await run_repository.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Agent worker queue is unavailable.",
            ) from exc
    else:
        asyncio.create_task(_execute_agent_run_locally(str(run.id)))
    return run


async def get_active_run(
    db: AsyncSession,
    *,
    conversation_id: str,
    user_id: str,
) -> AgentRun | None:
    await get_conversation(db, conversation_id, user_id)
    repository = RunRepository(db)
    return await repository.get_active_for_conversation(
        conversation_id=conversation_id,
        user_id=user_id,
    )


async def cancel_run(
    db: AsyncSession,
    *,
    run_id: str,
    user_id: str,
) -> AgentRun:
    repository = RunRepository(db)
    run = await repository.get_by_id_for_user(run_id, user_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found.",
        )
    if run.status in {"completed", "failed", "canceled"}:
        return run
    await repository.set_status(run, "canceling")
    await repository.commit()
    return run


async def stream_run_events(
    db: AsyncSession,
    *,
    run_id: str,
    user_id: str,
    after_sequence: int = 0,
) -> AsyncIterator[bytes]:
    repository = RunRepository(db)
    run = await repository.get_by_id_for_user(run_id, user_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found.",
        )

    persist_events = agent_event_persist_enabled(run.request_config)
    stream_events = agent_stream_enabled(run.request_config)
    redis = get_redis_client() if stream_events else None
    stream_key = run_stream_key(run_id)
    last_sequence = after_sequence
    last_redis_id = "$" if persist_events else "0-0"
    terminal_types = {"done", "error"}

    while True:
        emitted = False
        if persist_events:
            async for payload in iter_persisted_run_events(
                db,
                run_id=run_id,
                after_sequence=last_sequence,
            ):
                emitted = True
                last_sequence = int(payload.get("sequence") or last_sequence)
                yield json_line_event(payload)
                if payload.get("type") in terminal_types:
                    return

        if emitted:
            continue

        if not stream_events:
            await db.refresh(run)
            if not persist_events and run.status in {"completed", "failed", "canceled"}:
                event_type = "error" if run.status == "failed" else "done"
                yield json_line_event(
                    {
                        "sequence": last_sequence + 1,
                        "run_id": run_id,
                        "status": run.status,
                        "type": event_type,
                        "message": run.error,
                        "conversation_id": str(run.conversation_id),
                        "message_id": str(run.assistant_message_id),
                    }
                )
                return
            await asyncio.sleep(0.25)
            await db.rollback()
            continue

        response = await redis.xread(
            {stream_key: last_redis_id},
            block=config.run_stream_poll_timeout_ms,
            count=25,
        )
        if not response:
            await db.rollback()
            continue

        for _, entries in response:
            for entry_id, fields in entries:
                last_redis_id = entry_id
                raw_payload = fields.get("payload")
                if not isinstance(raw_payload, str):
                    continue
                try:
                    payload = json.loads(raw_payload)
                except json.JSONDecodeError:
                    continue
                sequence = int(payload.get("sequence") or 0)
                if sequence <= last_sequence:
                    continue
                last_sequence = sequence
                yield json_line_event(payload)
                if payload.get("type") in terminal_types:
                    return
