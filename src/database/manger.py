import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.configs.config import config

from .base import Base

_NOT_INITIALIZED_MSG = "PostgreManger is not initialized."


class PostgreManger:
    """PostgreSQL 运行时资源的唯一管理者。

    只负责 engine / session factory / schema 初始化 / 资源释放的生命周期收口，
    不涉及具体业务表设计、agent 执行、ARQ 或 Redis Stream。
    """

    def __init__(self) -> None:
        # engine 与 session_maker 通过 get_engine() / get_session_maker() 懒加载，不外部注入。
        self.engine: AsyncEngine | None = None
        self.session_maker: async_sessionmaker[AsyncSession] | None = None
        # LangGraph checkpoint 连接池，接入前用 None 占位。
        self.langgraph_checkpointer_pool: Any | None = None
        # 初始化标记，防止重复初始化，并作为依赖方法的显式前置条件。
        self.initialized: bool = False

    def get_engine(self) -> AsyncEngine:
        """复用或创建 SQLAlchemy async engine。"""
        if self.engine is not None:
            return self.engine
        if not config.database_url:
            raise RuntimeError("Missing DATABASE_URL")
        self.engine = create_async_engine(
            config.database_url,
            echo=False,
            json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False),
            json_deserializer=json.loads,
            pool_pre_ping=True,
            pool_recycle=1800,
            pool_size=10,
            max_overflow=20,
        )
        return self.engine

    def get_session_maker(self) -> async_sessionmaker[AsyncSession]:
        """复用或创建 async session factory。"""
        if self.session_maker is None:
            self.session_maker = async_sessionmaker(
                self.get_engine(),
                expire_on_commit=False,
                class_=AsyncSession,
            )
        return self.session_maker

    async def initialize(self) -> None:
        """统一启动入口，只做资源准备，不做破坏性操作。"""
        if self.initialized:
            return
        # 1. 准备或复用 engine / session factory。
        self.get_engine()
        self.get_session_maker()
        # 2. 预留 LangGraph checkpoint pool 初始化位置（接入前保持 None）。
        self.langgraph_checkpointer_pool = None
        # 3. 标记初始化完成。
        self.initialized = True

    async def create_tables(self) -> None:
        """用当前 model 元数据创建缺失的表结构。"""
        if not self.initialized:
            raise RuntimeError(_NOT_INITIALIZED_MSG)
        async with self.get_engine().begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    @asynccontextmanager
    async def get_async_session_context(self) -> AsyncGenerator[AsyncSession]:
        """提供 async session 上下文，退出时自动提交。"""
        if not self.initialized:
            raise RuntimeError(_NOT_INITIALIZED_MSG)
        async with self.get_session_maker()() as session:
            yield session
            await session.commit()

    async def dispose(self) -> None:
        """释放所有持有的资源，并重置到未初始化状态。"""
        if self.langgraph_checkpointer_pool is not None:
            await self.langgraph_checkpointer_pool.close()
            self.langgraph_checkpointer_pool = None
        if self.engine is not None:
            await self.engine.dispose()
        self.engine = None
        self.session_maker = None
        self.initialized = False


postgres_manager = PostgreManger()
