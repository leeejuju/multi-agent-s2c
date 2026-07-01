import asyncio
import json
from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.configs import config
from src.database import Conversation, Message
from src.database.models import AgentRun
from src.database.repositories import ConversationRepository, RunRepository

from .agent_queue_service import (
    agent_stream_enabled,
    get_redis_client,
    json_line_event,
    run_stream_key,
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
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Agent run interface has been removed.",
    )


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

    stream_events = agent_stream_enabled(run.request_config)
    redis = get_redis_client() if stream_events else None
    stream_key = run_stream_key(run_id)
    last_sequence = after_sequence
    last_redis_id = "0-0"
    terminal_types = {"done", "error"}

    while True:
        if not stream_events:
            await db.refresh(run)
            if run.status in {"completed", "failed", "canceled"}:
                event_type = "error" if run.status == "failed" else "done"
                assistant_message = await repository.get_message_for_run(run_id, "assistant")
                yield json_line_event(
                    {
                        "sequence": last_sequence + 1,
                        "run_id": run_id,
                        "status": run.status,
                        "type": event_type,
                        "message": run.error,
                        "conversation_id": str(run.conversation_id),
                        "message_id": str(assistant_message.id) if assistant_message else "",
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
