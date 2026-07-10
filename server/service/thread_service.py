import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal

from langchain.messages import HumanMessage
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

    @property
    def langchain_msg(self) -> HumanMessage:
        """构建输入消息转化为langchain标准格式"""
        if not self.image_content:
            return HumanMessage(content=self.content)
        return HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": self.content,
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": self.image_content,
                    },
                },
            ]
        )


async def _build_agent_runtime(
    agent_slug: str,
    user: User,
    thread_id: str | None,
    db: AsyncSession,
    agent_type: Literal["father", "son"] = "father",
) -> tuple[Any, BaseAgent]:
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

    agent_instance: BaseAgent = agent_manager.get_agent(
        agent_id=agent.backend_id  # ty:ignore[invalid-argument-type]
    )

    if not agent_instance:
        raise ValueError("当前Agent实例不存在")

    return agent, agent_instance


async def _build_agent_runtime_context(
    uid: str, run_id: str, thread_id: str, request_id: str
):
    agent_runtime_context = {}
    agent_system_prompt = "test_Agent_prompt"
    agent_runtime_context.update(
        {
            "uid": uid,
            "run_id": run_id,
            "thread_id": thread_id,
            "request_id": request_id,
            "system_prompt": agent_system_prompt,
        }
    )


async def _check_conv_status(
    *, conv_repo: ConversationRepository, thread_id: str, uid: str, agent_item: Agent
):
    """确保当前的conv存在"""
    current_conv = conv_repo.get_conversation_by_thead_id(thread_id)
    if not current_conv:
        conv_repo.create_conversation(
            uid=uid,
            thread_id=thread_id,
            agent_id=agent_item.slug,
            conversation_metadata={"backend_id": agent_item.backend_id},
        )
        return
    
    # TODO 其他的错点


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
    human_msg: HumanMessage = thread_input_message.langchain_msg

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
            "has_image": bool(image_content),
        }
    )

    messages = [human_msg]
    agent_runtime_context = _build_agent_runtime_context()
    agent_context = agent_instacne.agent_context()
    agent_context.update(agent_runtime_context)

    # 确保当前的会话存在
    conv_repo = ConversationRepository(db)

    await _check_conv_status(
        conv_repo=conv_repo,
        thread_id=thread_id,
        uid=current_user.uid,
        agent_item=agent_item,
    )
    
    # TODO确保文件相关存在，此处按下不表
    
    # 增加langraph的可配置参数，用于给运行中添加有用的参数，无论是模型还是参数，都可以，会直接归纳到configurable **kwargs
    langgrah_config = {"configurable":{"uid": current_user.uid, "thread_id":thread_id}}
    
    # 配置完毕后，引入agent执行
    agent_instacne.stream_messages(messages, context=agent_context)
    
    


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


# def _build_run_config(
#     agent_id: str,
#     thread_id: str,
#     user_id: str | None,
#     metadata: dict[str, Any] | None,
# ) -> dict[str, Any]:
#     configurable: dict[str, Any] = {
#         "agent_id": agent_id,
#         "thread_id": thread_id,
#     }
#     if user_id is not None:
#         configurable["uid"] = str(user_id)
#     return {
#         "configurable": configurable,
#         "metadata": metadata or {},
#     }


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
