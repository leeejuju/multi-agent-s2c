from abc import abstractmethod

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph
from psycopg_pool import AsyncConnectionPool

from src.configs.config import config as sys_config
from src.utils import logger

from .base_context import BaseContext


class BaseAgent:
    name: str = "base_agent"
    description: str = "底层代理"
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
    def get_agent(self, checkpointer=None) -> CompiledStateGraph:
        pass

    @classmethod
    async def setup_checkpointer(cls):
        conn_string = sys_config.database_url.replace("+asyncpg", "")
        cls._pool = AsyncConnectionPool(conn_string, min_size=1, max_size=5, open=True)
        conn = await cls._pool.getconn()
        cls._checkpointer = AsyncPostgresSaver(conn)
        await cls._checkpointer.setup()
        logger.info("Checkpointer 初始化完成。")

    @classmethod
    async def teardown_checkpointer(cls):
        if cls._pool:
            await cls._pool.close()
            logger.info("Checkpointer 已关闭。")

    def init_graph(self):
        if self._graph is None:
            self._graph = self.get_agent(checkpointer=self._checkpointer)
        return self._graph

    async def stream(self, messages, config=None, **kwargs):
        agent = self.init_graph()
        async for mode, chunk in agent.astream(
            messages,
            config=config,
            stream_mode=["messages", "values"],
            **kwargs,
        ):
            yield mode, chunk
