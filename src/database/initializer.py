from sqlalchemy.ext.asyncio import AsyncEngine

from . import models as _models  # noqa: F401
from .base import Base
from .session import get_engine


class PostgreSQLInitializer:
    def __init__(self, engine: AsyncEngine | None = None) -> None:
        self.engine = engine or get_engine()

    async def initialize(self) -> None:
        await self.create_schema()

    async def create_schema(self) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
