import asyncio
from abc import abstractmethod

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph
from psycopg_pool import AsyncConnectionPool

from src.configs.config import config as sys_config
from src.utils.logger import logger

from .base_context import BaseContext


class BaseAgent:
    name: str = "base_agent"
    description: str = "鍩篴gent"
    context: type[BaseContext] = BaseContext

    _pool: AsyncConnectionPool | None = None
    _checkpointer: AsyncPostgresSaver | None = None
    _graph: CompiledStateGraph | None = None
    _checkpoint_lock: asyncio.Lock | None = None

    def __init__(self):
        pass


    @classmethod
    async def setup_checkpointing(cls) -> None:
        if BaseAgent._checkpoint_lock is None:
            BaseAgent._checkpoint_lock = asyncio.Lock()
        async with BaseAgent._checkpoint_lock:
            if BaseAgent._checkpointer is not None:
                return

            database_url = sys_config.database_url
            if not database_url:
                logger.warning(
                    "LangGraph checkpointing is disabled because DATABASE_URL is empty."
                )
                return

            BaseAgent._pool = AsyncConnectionPool(
                conninfo=database_url,
                max_size=20,
                kwargs={"autocommit": True, "prepare_threshold": 0},
                open=False,
            )
            await BaseAgent._pool.open()
            BaseAgent._checkpointer = AsyncPostgresSaver(BaseAgent._pool)
            await BaseAgent._checkpointer.setup()
            logger.info("LangGraph Postgres checkpointing is ready.")
            

    def get_checkpointer(self) -> AsyncPostgresSaver | None:
        return BaseAgent._checkpointer

    @property
    def module_name(self):
        return self.__class__.__name__

    def id(self):
        return f"{self.module_name}_{self.name}"

    @abstractmethod
    def get_agent(self, context: BaseContext) -> CompiledStateGraph:
        pass

    async def stream_messages(self, messages, config=None, **kwargs):
        await self.setup_checkpointing()

        context: BaseContext = self.context().get_context()
        agent: CompiledStateGraph = self.get_agent(context)
        async for mode, chunk in agent.astream(
            messages,
            config=config,
            stream_mode=["messages", "updates"],
            **kwargs,
        ):
            logger.info(f"mode={mode}, chunk={chunk}")
            if mode == "messages":
                yield mode, chunk[0]
            else:
                yield mode, chunk
