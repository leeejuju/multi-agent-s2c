import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager
from src.agents.base_agent import BaseAgent
from src.database import Agent, Message, User
from src.database.repositories import AgentRepository, ConversationRepository


@dataclass(frozen=True)
class AgentInputMsg:
    content: str
    msg_type: str
    image_content: str | None
    msg_metadata: dict[str, Any] = field(default_factory=dict)

async def _build_agent_runtime(
    agent_slug: str,
    user: User,
    thread_id: str | None,
    db: AsyncSession,
    agent_type: Literal["father", "son"] = "father",
) -> tuple[Any, Any]:
    """根据传递的参数，构建 agent 环境

    Args:
        agent_id (str): agent name
        user (User): 当前用户可访问的agent
        thread_id (str | None): _description_
        agent_type (Literal["father";, "sub"]): 父agent还是子agennt

    Returns:
        tuple[Any, Any, Any]: _description_
    """
    agent_repo = AgentRepository(db)

    if not agent_slug:
        raise ValueError("未配置agent")

    agent = await agent_repo.get_agent_by_slug(
        agent_slug=agent_slug, agent_type=agent_type
    )

    if not agent:
        raise ValueError("当前智能体不存在")

    agent_instance = agent_manager.get_agent(
        agent_id=agent.backend_id  # ty:ignore[invalid-argument-type]
    )

    if not agent_instance:
        raise ValueError("当前Agent实例不存在")

    return agent, agent_instance


async def stream_thread_response(
    *,
    agent_slug: str,
    thread_id: str,
    runtime_metadata: dict[str, Any] | None = None,
    thread_input_message: AgentInputMsg,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> AsyncIterator[bytes]:
    """前端发送的内容产生消息流

    Args:
        agent_id (str): agent的名称
        thread_id (str): 当前会话的id
        thread_input_message (str): 输入的消息
        current_user (AuthenticatedUser): 当前用户
        db (AsyncSession): 数据库session
        metadata (dict[str, Any] | None, optional): 附带的信息，如agent类型，本此请求的等

    Returns:
        AsyncIterator[bytes]: _description_
    """

    # 记录执行事件
    start_time = asyncio.get_event_loop().time()

    # guard
    if not thread_id:
        thread_id = str(uuid.uuid4())

    runtime_metadata = dict(runtime_metadata or {})

    # 设置单次 request_id 作为单次断联的标志以及附件的隔离归属
    if not runtime_metadata.get("request_id"):
        runtime_metadata["request_id"] = str(uuid.uuid4())

    # 抽取agent执行的元数据
    query: str = thread_input_message.content
    image_content: str | None = thread_input_message.image_content
    msg_type: str = thread_input_message.msg_type

    # 根据agent_id解析 agent 的运行配置

    agent_item, agent_instacne = await _build_agent_runtime(
        agent_slug=agent_slug,
        user=current_user,
        thread_id=thread_id,
        db=db,
        agent_type=runtime_metadata.get("run_type", ""),
    )

    runtime_metadata.update(
        {
            "query": query,
            "agent_slug": agent_item.slug,
            "agent_instance": agent_instacne,
            "thread_id": thread_id,
            "uid": current_user.uid,
            "has_image":bool(image_content)
        }
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
