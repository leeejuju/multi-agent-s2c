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
from src.database import Agent, User
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
) -> dict[str, str]:
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
    # FIXME: 调用方需要拿到该字典来构造 Agent 的运行上下文。
    return agent_runtime_context


async def _check_conv_status(
    *, conv_repo: ConversationRepository, thread_id: str, uid: str, agent_item: Agent
):
    """确保当前的conv存在"""
    # FIXME: run 只能使用已经创建且属于当前用户的 Conversation。
    current_conv = await conv_repo.get_conversation_by_thread_id_for_user(
        thread_id=thread_id,
        user_id=uid,
    )
    if not current_conv:
        raise ValueError(f"当前会话不存在：{thread_id}")
    if current_conv.agent_id != agent_item.slug:
        raise ValueError(f"当前会话未绑定智能体：{agent_item.slug}")

    # TODO 其他的错点


async def stream_agent_response(
    *,
    agent_slug: str,
    thread_id: str,
    runtime_metadata: dict,
    thread_input_message: AgentInputMsg,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> AsyncIterator[Any]:
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
    # guard
    if not thread_id:
        thread_id = str(uuid.uuid4())

    def stream_agent_chunk(content = None, **kwargs):
        """封装agent产生的chunk"""
        return (json.dumps(
            obj={
                "thread_id":thread_id,
                "request_id":runtime_metadata.get("request_id", "")
                **kwargs
            },
            ensure_ascii=False).encode("utf-8"))


    runtime_metadata = dict(runtime_metadata or {})

    # 设置单次 request_id 作为单次断联的标志以及附件的隔离归属
    if not runtime_metadata.get("request_id"):
        runtime_metadata["request_id"] = str(uuid.uuid4())

    # 抽取agent执行的元数据
    query: str = thread_input_message.content
    image_content: str | None = thread_input_message.image_content
    human_msg: HumanMessage = thread_input_message.langchain_msg

    # 根据agent_id解析 agent 的运行配置

    agent_item, agent_instacne = await _build_agent_runtime(
        agent_slug=agent_slug,
        user=current_user,
        thread_id=thread_id,
        db=db,
        # FIXME: 当前 Worker 只执行顶层 Agent；缺省值必须能命中 father 查询分支。
        agent_type=runtime_metadata.get("run_type") or "father",
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
    agent_runtime_context = await _build_agent_runtime_context(
        uid=current_user.uid,  # ty:ignore[invalid-argument-type]
        run_id=runtime_metadata.get("run_id"),# ty:ignore[invalid-argument-type]
        thread_id=thread_id,
        request_id=runtime_metadata.get("request_id")  # ty:ignore[invalid-argument-type]
    )

    # 确保当前的会话存在
    conv_repo = ConversationRepository(db)

    await _check_conv_status(
        conv_repo=conv_repo,
        thread_id=thread_id,
        uid=current_user.uid,  # ty:ignore[invalid-argument-type]
        agent_item=agent_item,
    )

    # TODO确保文件相关存在，此处按下不表

    # FIXME: 通过 runtime_context 传值，避免把 context 重复透传给 astream_events。
    async for method, payload in agent_instacne.stream_messages_with_event(
        messages,  # ty:ignore[invalid-argument-type]
        runtime_context=agent_runtime_context,
    ):
        print(method, payload)
        # if method == "messages":
        #     # FIXME: 原型阶段直接透传真实的 v3 messages payload，供 Worker 打印验证。
        #     logger.info(f"messages 模式下输出为{payload}")
        #     yield payload
