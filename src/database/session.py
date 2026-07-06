from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from .manger import postgres_manager


def get_engine() -> AsyncEngine:
    return postgres_manager.get_engine()


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    return postgres_manager.get_session_maker()


@asynccontextmanager
async def session_context() -> AsyncGenerator[AsyncSession, None]:
    async with postgres_manager.get_async_session_context() as session:
        yield session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_context() as session:
        yield session
