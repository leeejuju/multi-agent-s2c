import os
from typing import Any

from langfuse.langchain import CallbackHandler

from src.configs.config import config as sys_config
from src.utils import logger


def get_langfuse_handler() -> CallbackHandler | None:
    if not (
        sys_config.langfuse_tracing_enabled
        and sys_config.langfuse_public_key
        and sys_config.langfuse_secret_key
    ):
        return None

    try:
        os.environ["LANGFUSE_PUBLIC_KEY"] = sys_config.langfuse_public_key
        os.environ["LANGFUSE_SECRET_KEY"] = sys_config.langfuse_secret_key
        os.environ["LANGFUSE_BASE_URL"] = sys_config.langfuse_base_url
        os.environ["LANGFUSE_TRACING_ENVIRONMENT"] = (
            sys_config.langfuse_tracing_environment
        )
        return CallbackHandler()
    except Exception:
        logger.exception("Failed to initialize Langfuse callback handler.")
        return None


def with_langfuse_config(
    *,
    user_id: str,
    conversation_id: str,
    agent_id: str,
    user_message_id: str,
    message_type: str,
    attachment_count: int,
    request_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    metadata = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "agent_id": agent_id,
        "user_message_id": user_message_id,
        "message_type": message_type,
        "attachment_count": attachment_count,
        **dict(request_config or {}),
    }

    config: dict[str, Any] = {
        "metadata": {
            **metadata,
            "langfuse_user_id": user_id,
            "langfuse_session_id": conversation_id,
            "langfuse_trace_name": f"chat:{agent_id}",
        },
    }
    config["tags"] = ["chat", agent_id]

    handler = get_langfuse_handler()
    if handler is not None:
        config["callbacks"] = [*list(config.get("callbacks") or []), handler]

    return config
