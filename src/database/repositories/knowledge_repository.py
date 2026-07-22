from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Knowledge


class KnowledgeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(
        self,
        *,
        user_id: str,
        kind: str | None = None,
    ) -> list[Knowledge]:
        statement = select(Knowledge).where(Knowledge.user_id == int(user_id))
        if kind is not None:
            statement = statement.where(Knowledge.kind == kind)
        result = await self.session.execute(
            statement.order_by(
                Knowledge.updated_at.desc(),
                Knowledge.created_at.desc(),
            )
        )
        return list(result.scalars().all())
