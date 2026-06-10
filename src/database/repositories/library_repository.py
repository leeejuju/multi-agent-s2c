from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import LibraryItem


class LibraryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_items(
        self,
        *,
        user_id: str,
        kind: str | None = None,
    ) -> list[LibraryItem]:
        statement = select(LibraryItem).where(LibraryItem.user_id == UUID(user_id))
        if kind is not None:
            statement = statement.where(LibraryItem.kind == kind)
        result = await self.session.execute(
            statement.order_by(LibraryItem.updated_at.desc(), LibraryItem.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self,
        *,
        item_id: str,
        user_id: str,
    ) -> LibraryItem | None:
        result = await self.session.execute(
            select(LibraryItem).where(
                LibraryItem.id == UUID(item_id),
                LibraryItem.user_id == UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def create_item(
        self,
        *,
        user_id: str,
        kind: str,
        title: str,
        status: str = "draft",
        summary: str = "",
        project_name: str | None = None,
        genre: str | None = None,
        content_text: str | None = None,
        source_file_name: str | None = None,
        source_content_type: str | None = None,
        source_file_size: int | None = None,
        object_key: str | None = None,
        cover_url: str | None = None,
        shot_count: int = 0,
        style_tags: list[Any] | None = None,
        characters: list[Any] | None = None,
        relationships: list[Any] | None = None,
        item_metadata: dict[str, Any] | None = None,
    ) -> LibraryItem:
        item = LibraryItem(
            id=uuid4(),
            user_id=UUID(user_id),
            kind=kind,
            title=title,
            project_name=project_name,
            genre=genre,
            status=status,
            summary=summary,
            content_text=content_text,
            source_file_name=source_file_name,
            source_content_type=source_content_type,
            source_file_size=source_file_size,
            object_key=object_key,
            cover_url=cover_url,
            shot_count=shot_count,
            style_tags=style_tags or [],
            characters=characters or [],
            relationships=relationships or [],
            item_metadata=item_metadata or {},
        )
        self.session.add(item)
        await self.session.flush()
        return item

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
