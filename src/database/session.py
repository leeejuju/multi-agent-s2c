from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.configs.config import config

_engine = None
_session_maker = None


def get_engine():
    global _engine
    if _engine is None:
        if not config.database_url:
            raise RuntimeError("DATABASE_URL is required to initialize the database.")
        _engine = create_async_engine(config.database_url, echo=False)
    return _engine


def get_session_maker():
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session_maker = get_session_maker()
    async with session_maker() as session:
        yield session
