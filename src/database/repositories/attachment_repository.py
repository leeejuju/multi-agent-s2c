from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Attachment


class AttachmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def search_for_user(
        self,
        *,
        user_id: str,
        query: str,
        limit: int = 5,
    ) -> list[Attachment]:
        pattern = f"%{query}%"
        result = await self.session.execute(
            select(Attachment)
            .where(
                Attachment.user_id == UUID(user_id),
                or_(
                    Attachment.file_name.ilike(pattern),
                    Attachment.content_type.ilike(pattern),
                    Attachment.file_path.ilike(pattern),
                ),
            )
            .order_by(Attachment.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
