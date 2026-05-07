from abc import abstractmethod

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph
from psycopg_pool import AsyncConnectionPool

from src.configs.config import config as sys_config

from .base_context import BaseContext


class BaseAgent:
    name: str = "base_agent"
    description: str = "基agent"
    context: type[BaseContext] = BaseContext

    _pool: AsyncConnectionPool | None = None
    _checkpointer: AsyncPostgresSaver | None = None
    _graph: CompiledStateGraph | None = None

    def __init__(self):
        pass

    @property
    def module_name(self):
        return self.__class__.__name__

    def id(self):
        return f"{self.module_name}_{self.name}"

    @abstractmethod
    def get_agent(self, context: BaseContext) -> CompiledStateGraph:
        pass


    async def stream_messages(self, messages, config=None, **kwargs):
        context:BaseContext = self.context().get_context()    
        agent: CompiledStateGraph = self.get_agent(context)    
        async for mode, chunk in agent.astream(
            messages,
            config=config,
            stream_mode=["messages", "values"],
            **kwargs,
        ):
            yield mode, chunk
