import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents import agent_manager
from src.agents.base_agent import BaseAgent
from src.database import Message
from src.database.repositories import ConversationRepository


async def stream_thread_response(
    *,
    db: AsyncSession,
    agent_id: str,
    thread_id: str,
    metadata: dict[str, Any] | None = None,
    thread_input_message: str,
    user_id: str,
) -> AsyncIterator[bytes]:
    repository = ConversationRepository(session=db)
    conversation = await repository.get_conversation_by_thread_id_for_user(
        thread_id=thread_id,
        user_id=user_id,
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    agent = _resolve_agent(agent_id)
    if not _agent_matches_conversation(agent, agent_id, conversation.agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent does not match conversation.",
        )
    if not thread_input_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thread input message is required.",
        )

    history = await repository.get_messages(str(conversation.id))
    _, user_message = await repository.save_message(
        role="user",
        content=thread_input_message,
        conversation_id=str(conversation.id),
        status="completed",
    )
    await repository.commit()

    messages = _build_agent_messages(history, thread_input_message)
    run_config = _build_run_config(
        agent_id,
        thread_id,
        user_id,
        metadata,
    )
    assistant_chunks: list[str] = []

    yield _jsonl_bytes(
        {
            "type": "start",
            "agent_id": agent_id,
            "thread_id": thread_id,
            "message_id": str(user_message.id),
        }
    )

    try:
        async for _, chunk in agent.stream_messages(
            {"messages": messages},
            config=run_config,
        ):
            delta = _message_delta_text(chunk)
            if not delta:
                continue
            assistant_chunks.append(delta)
            yield _jsonl_bytes(
                {
                    "type": "token",
                    "agent_id": agent_id,
                    "thread_id": thread_id,
                    "delta": delta,
                }
            )

        assistant_content = "".join(assistant_chunks)
        _, assistant_message = await repository.save_message(
            role="assistant",
            content=assistant_content,
            conversation_id=str(conversation.id),
            status="completed",
        )
        await repository.commit()
        yield _jsonl_bytes(
            {
                "type": "done",
                "agent_id": agent_id,
                "thread_id": thread_id,
                "message_id": str(assistant_message.id),
            }
        )
    except Exception as exc:
        await repository.rollback()
        yield _jsonl_bytes(
            {
                "type": "error",
                "agent_id": agent_id,
                "thread_id": thread_id,
                "error_type": exc.__class__.__name__,
                "error": str(exc),
            }
        )


def _resolve_agent(agent_id: str) -> BaseAgent:
    try:
        return agent_manager.get_agent(agent_id)
    except KeyError:
        for agent_summary in agent_manager.list_agents():
            if agent_summary["name"] == agent_id:
                return agent_manager.get_agent(agent_summary["id"])
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Agent not found.",
    )


def _agent_matches_conversation(
    agent: BaseAgent,
    requested_agent_id: str,
    conversation_agent_id: str,
) -> bool:
    accepted_ids = {
        requested_agent_id,
        agent.name,
        agent.module_name,
        agent.id(),
    }
    return conversation_agent_id in accepted_ids


def _build_agent_messages(
    history: list[Message],
    thread_input_message: str,
) -> list[dict[str, str]]:
    messages = [
        {"role": message.role, "content": message.content}
        for message in history
        if message.role in {"user", "assistant", "system"} and message.content
    ]
    messages.append({"role": "user", "content": thread_input_message})
    return messages


def _build_run_config(
    agent_id: str,
    thread_id: str,
    user_id: str | None,
    metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    configurable: dict[str, Any] = {
        "agent_id": agent_id,
        "thread_id": thread_id,
    }
    if user_id is not None:
        configurable["uid"] = str(user_id)
    return {
        "configurable": configurable,
        "metadata": metadata or {},
    }


def _message_delta_text(chunk: Any) -> str:
    content = getattr(chunk, "content", chunk)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)
    return ""


def _jsonl_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")
