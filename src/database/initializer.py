from sqlalchemy.ext.asyncio import AsyncEngine

from .migration import upgrade_database
from .session import get_engine


class PostgreSQLInitializer:
    def __init__(self, engine: AsyncEngine | None = None) -> None:
        self.engine = engine or get_engine()

    async def initialize(self) -> None:
        await self.migrate()

    async def migrate(self) -> None:
        await upgrade_database(self.engine)
