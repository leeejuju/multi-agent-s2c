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
    context: type[BaseContext] = BaseContext

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

    async def stream_messages(self, messages, config=None, **kwargs):

        context: BaseContext = self.context()
        agent: CompiledStateGraph = self.get_agent(context)
        async for mode, chunk in agent.astream(
            messages,
            config=config,
            stream_mode=["messages"],
            version="v3",
            **kwargs,
        ):
            if mode == "messages":
                yield mode, chunk[0]
            else:
                yield mode, chunk
