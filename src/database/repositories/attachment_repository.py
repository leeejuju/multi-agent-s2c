from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Attachment


class AttachmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        conversation_id: str,
        user_id: str,
        file_name: str,
        content_type: str,
        file_size: int,
        file_path: str,
    ) -> Attachment:
        attachment = Attachment(
            conversation_id=UUID(conversation_id),
            user_id=UUID(user_id),
            file_name=file_name,
            content_type=content_type,
            file_size=file_size,
            file_path=file_path,
        )
        self.session.add(attachment)
        await self.session.flush()
        return attachment

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
