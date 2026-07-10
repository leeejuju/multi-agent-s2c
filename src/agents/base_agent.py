import asyncio
from abc import abstractmethod

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph

from src.configs.config import config as sys_config
from src.utils.logger import logger

from .base_context import BaseContext


class BaseAgent:
    name: str = "base_agent"
    description: str = ""
    agent_context: type[BaseContext] = BaseContext

    def __init__(self, **kwargs):
        self.agent = None
        self.checkpointer = None

    def get_checkpointer(self) -> AsyncPostgresSaver | None:
        pass

    @property
    def module_name(self):
        return self.__class__.__name__

    def id(self):
        return f"{self.module_name}_{self.name}"

    @abstractmethod
    def get_agent(self, context: BaseContext) -> CompiledStateGraph:
        pass

    async def stream_messages(
        self, messages: list[str], runtime_context=None, **kwargs
    ):
        """纯异步流失输出之用，测试

        Args:
            messages (list[str]): 输入的对话内容
            runtime_context (_type_, optional): 当前agent执行的上下文

        Yields:
            _type_: _description_
        """

        context: BaseContext = self.agent_context()
        context.update_context(runtime_context or {})
        agent: CompiledStateGraph = self.get_agent(context)
        async for mode, chunk in agent.astream(
            messages,
            config=runtime_context,
            stream_mode=["messages"],
            **kwargs,
        ):
            if mode == "messages":
                yield mode, chunk[0]
            else:
                yield mode, chunk

    async def stream_messages_with_event(
        self, messages: list[str], runtime_context=None, **kwargs
    ):
        """使用lanchain 的stream as event 方法输出内容，以便形成可观测的输出模式

        Args:
            messages (list[str]): 输入消息
            runtime_context (_type_, optional): 当前运行所需的上下文

        """

        # 配置上下文
        context: BaseContext = self.agent_context()
        context.update_context(runtime_context or {})
        agent: CompiledStateGraph = self.get_agent(context)
        logger.info(f"智能体：{agent} 初始化成功")

        # 配置运行中的 configuarable 参数， 具体可看 agent 的stream方法
        input_config = {
            "configurable": {"thread_id": context.thread_id, "uid": context.uid}
        }

        # TODO
        # 需要加上 langfuse callback 的调度器，这里不写

        # 以 v3 的形式返回，主要是看看效果啥样
        for stream_event in await agent.astream_events(
            input={"messages": messages},
            context=context,
            config=input_config,
            version="v3",
        ):
            
            pass
        
