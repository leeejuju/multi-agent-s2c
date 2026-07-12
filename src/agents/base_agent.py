from abc import abstractmethod

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph

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
        async with await agent.astream_events(
            {"messages": messages},
            config=input_config,
            version="v3",
            context=context,
            **kwargs,
        ) as stream_events:  # ty:ignore[no-matching-overload]
            async for stream_event in stream_events:
                stream_methods = stream_event.get("method")
                stream_params = stream_event.get("params")
                stream_data = stream_params.get("data") #此处根据方法不同，内容也不同,

                if stream_methods == "messages":
                    # FIXME: 向上游返回协议事件里的真实 data，不能返回 typing.Any 本身。
                    yield "messages", stream_data


                # v3 返回的类型具体可以看官方的文档
                # Each event is a ProtocolEvent envelope wrapping a channel-specific payload.
                # The same shape is what a transformer’s process(event) receives.

                # ProtocolEvent 长得像
                #
                # class ProtocolEvent(TypedDict):
                #    seq: int                    # strictly increasing within a run; use for ordering
                #    method: str                 # channel name: "messages", "values", "updates", "custom", "tools", "lifecycle", ...
                #    params: ProtocolEventParams


                #    class ProtocolEventParams(TypedDict):
                #       namespace: list[str]        # path of "<name>:<runtime_id>" segments from the root graph; [] is the root
                #       timestamp: int              # wall-clock milliseconds; can drift, don't rely on for ordering
                #       data: Any   # channel-specific payload; shape depends on `method`
