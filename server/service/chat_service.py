import json
from typing import Any, AsyncIterator, Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents import agent_manager
from src.database import Conversation, Message
from src.database.repositories import ConversationRepository
from src.utils import logger


def _extract_token(chunk: Any) -> str:
    message = chunk[0] if isinstance(chunk, tuple) and chunk else chunk
    content = getattr(message, "content", None)

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)

    return ""


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


async def save_message(
    db: AsyncSession,
    role: str,
    content: str,
    conversation_id: str | None = None,
    user_id: str | None = None,
) -> tuple[str, Message]:
    repository = ConversationRepository(session=db)
    return await repository.save_message(
        role,
        content,
        conversation_id=conversation_id,
        user_id=user_id,
    )


def stream_chunk(
    db: AsyncSession,
    *,
    agent_id: str,
    input_text: str,
    conversation_id: str | None,
    user_id: str,
    attachments: Sequence[Any] | None = None,
) -> AsyncIterator[bytes]:
    meta: dict[str, Any] = {"request_id": None}

    def generater_chunk(content: str | None = None, **kwargs: Any) -> bytes:
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

    agent = agent_manager.get_agent(agent_id)

    async def chunk_generator() -> AsyncIterator[bytes]:
        resolved_conversation_id = conversation_id
        full_content = ""
        try:
            resolved_conversation_id, _ = await save_message(
                db,
                "user",
                input_text,
                conversation_id=conversation_id,
                user_id=user_id,
            )
            await db.commit()
            meta.update(
                {
                    "request_id": resolved_conversation_id,
                    "conversation_id": resolved_conversation_id,
                }
            )

            image_urls = [
                getattr(attachment, "access_url", "")
                for attachment in attachments or []
                if getattr(attachment, "content_type", "").startswith("image/")
                and getattr(attachment, "access_url", "")
            ]
            message_type = "multimodal_image" if image_urls else "text"
            init_msg: dict[str, Any] = {
                "role": "user",
                "content": input_text,
                "type": "human",
                "message_type": message_type,
            }
            if image_urls:
                init_msg["image_content"] = image_urls
                agent_content: str | list[dict[str, Any]] = [
                    {"type": "text", "text": input_text},
                    *[
                        {"type": "image_url", "image_url": {"url": image_url}}
                        for image_url in image_urls
                    ],
                ]
            else:
                agent_content = input_text

            yield generater_chunk(
                status="init",
                type="metadata",
                meta=meta,
                msg=init_msg,
                conversation_id=resolved_conversation_id,
            )

            async for mode, chunk in agent.stream_messages(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": agent_content,
                        }
                    ]
                },
                config={"configurable": {"thread_id": resolved_conversation_id}},
            ):
                if mode != "messages":
                    continue

                token = _extract_token(chunk)
                if not token:
                    continue

                full_content += token
                yield generater_chunk(
                    token,
                    status="stream",
                    type="token",
                    conversation_id=resolved_conversation_id,
                )

            await save_message(
                db,
                "assistant",
                full_content,
                conversation_id=resolved_conversation_id,
            )
            await db.commit()
            yield generater_chunk(
                status="done",
                type="done",
                conversation_id=resolved_conversation_id,
            )
        except Exception:
            await db.rollback()
            logger.exception(
                "Streaming chat failed: user_id=%s, conversation_id=%s.",
                user_id,
                resolved_conversation_id,
            )
            yield generater_chunk(
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
    conversation = await repository.get_by_id_for_user(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    await repository.delete(conversation)
    await db.commit()
