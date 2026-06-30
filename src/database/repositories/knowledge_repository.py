from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Knowledge


class KnowledgeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_items(
        self,
        *,
        user_id: str,
        kind: str | None = None,
    ) -> list[Knowledge]:
        statement = select(Knowledge).where(Knowledge.user_id == int(user_id))
        if kind is not None:
            statement = statement.where(Knowledge.kind == kind)
        result = await self.session.execute(
            statement.order_by(Knowledge.updated_at.desc(), Knowledge.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self,
        *,
        item_id: str,
        user_id: str,
    ) -> Knowledge | None:
        result = await self.session.execute(
            select(Knowledge).where(
                Knowledge.id == int(item_id),
                Knowledge.user_id == int(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def create_item(
        self,
        *,
        user_id: str,
        kind: str,
        title: str,
        summary: str = "",
        content_text: str | None = None,
        file_name: str | None = None,
        path: str | None = None,
        minio_url: str | None = None,
        markdown_file: str | None = None,
    ) -> Knowledge:
        item = Knowledge(
            user_id=int(user_id),
            kind=kind,
            title=title,
            summary=summary,
            content_text=content_text,
            file_name=file_name,
            path=path,
            minio_url=minio_url,
            markdown_file=markdown_file,
        )
        self.session.add(item)
        await self.session.flush()
        return item

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
