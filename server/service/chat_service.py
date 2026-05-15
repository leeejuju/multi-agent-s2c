import json
import os
from collections.abc import AsyncIterator, Sequence
from typing import Any

from fastapi import HTTPException, status
from langfuse.langchain import CallbackHandler
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents import agent_manager
from src.configs.config import config as sys_config
from src.database import Conversation, Message
from src.database.repositories import ConversationRepository
from src.utils import logger


def _is_langfuse_configured() -> bool:
    return bool(
        sys_config.langfuse_tracing_enabled
        and sys_config.langfuse_public_key
        and sys_config.langfuse_secret_key
    )


def _get_langfuse_handler() -> CallbackHandler | None:
    if not _is_langfuse_configured():
        return None

    try:
        os.environ["LANGFUSE_PUBLIC_KEY"] = sys_config.langfuse_public_key
        os.environ["LANGFUSE_SECRET_KEY"] = sys_config.langfuse_secret_key
        os.environ["LANGFUSE_BASE_URL"] = sys_config.langfuse_base_url
        os.environ["LANGFUSE_TRACING_ENVIRONMENT"] = sys_config.langfuse_tracing_environment
        return CallbackHandler()
    except Exception:
        logger.exception("Failed to initialize Langfuse callback handler.")
        return None


def _with_langfuse_tracing(
    run_config: dict[str, Any],
    *,
    user_id: str,
    conversation_id: str,
    agent_id: str,
    user_message_id: str,
    message_type: str,
    attachment_count: int,
) -> dict[str, Any]:
    handler = _get_langfuse_handler()
    if handler is None:
        return run_config

    config = dict(run_config)
    config["callbacks"] = [*list(config.get("callbacks") or []), handler]
    config["tags"] = [*list(config.get("tags") or []), "chat", agent_id]
    config["metadata"] = {
        **dict(config.get("metadata") or {}),
        "langfuse_user_id": user_id,
        "langfuse_session_id": conversation_id,
        "langfuse_trace_name": f"chat:{agent_id}",
        "agent_id": agent_id,
        "conversation_id": conversation_id,
        "user_message_id": user_message_id,
        "message_type": message_type,
        "attachment_count": attachment_count,
    }
    return config


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

            attachment_metadata = [
                attachment.model_dump(mode="json")
                if hasattr(attachment, "model_dump")
                else dict(attachment)
                if isinstance(attachment, dict)
                else {
                    key: getattr(attachment, key)
                    for key in (
                        "id",
                        "file_name",
                        "content_type",
                        "category",
                        "access_url",
                        "thumb_url",
                    )
                    if hasattr(attachment, key)
                }
                for attachment in attachments or []
            ]
            run_config = _with_langfuse_tracing(
                {
                    "configurable": {"thread_id": resolved_conversation_id},
                    "metadata": {
                        "user_id": user_id,
                        "conversation_id": resolved_conversation_id,
                        "agent_id": agent_id,
                        "attachment_count": len(attachment_metadata),
                    },
                },
                user_id=user_id,
                conversation_id=resolved_conversation_id,
                agent_id=agent_id,
                user_message_id=str(user_message.id),
                message_type=message_type,
                attachment_count=len(attachment_metadata),
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
                config=run_config,
            ):
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
