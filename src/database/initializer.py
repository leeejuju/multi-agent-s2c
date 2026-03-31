from sqlalchemy.ext.asyncio import AsyncEngine

from .base import Base
from .session import get_engine


class PostgreSQLInitializer:
    def __init__(self, engine: AsyncEngine | None = None) -> None:
        self.engine = engine or get_engine()

    async def initialize(self) -> None:
        await self.create_tables()

    async def create_tables(self) -> None:
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
