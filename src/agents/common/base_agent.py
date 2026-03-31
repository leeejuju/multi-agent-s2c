from abc import abstractmethod
from .base_context import BaseContext
from langgraph.graph.state import CompiledStateGraph

class BaseAgent:
    name: str = "base_agent"
    description: str = "底层代理"
    context: type[BaseContext] = BaseContext

    def __init__(self):
        pass

    @property
    def module_name(self):
        return self.__class__.__name__

    def id(self):
        return f"{self.module_name}_{self.name}"

    @abstractmethod
    def get_agent(self) -> CompiledStateGraph:
        """
        获取agent, 需子类重写
        """
        pass

    async def stream_messages(
        self,
        messages,
        config=None,
        input_context=None,
        **kwargs,
    ):
        """
        流式输出后处理
        """
        agent: CompiledStateGraph = self.get_agent()
        response = await agent.ainvoke(
            messages,
            config=config,
            context=input_context,
            **kwargs,
        )
        return response
