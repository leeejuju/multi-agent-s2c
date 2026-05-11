from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Conversation, Message


def _make_title(text: str, max_length: int = 80) -> str:
    title = text.split("\n")[0][:max_length].strip()
    return title if title else "New conversation"


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id_for_user(
        self,
        conversation_id: str,
        user_id: str,
    ) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(
                Conversation.id == UUID(conversation_id),
                Conversation.user_id == UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: str) -> list[Conversation]:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == UUID(user_id))
            .order_by(Conversation.updated_at.desc())
        )
        return list(result.scalars().all())

    async def save_message(
        self,
        role: str,
        content: str,
        conversation_id: str | None = None,
        user_id: str | None = None,
    ) -> tuple[str, Message]:
        if conversation_id:
            conv_id = conversation_id
        else:
            conv = Conversation(
                id=uuid4(),
                user_id=UUID(user_id),
                title=_make_title(content),
            )
            self.session.add(conv)
            await self.session.flush()
            conv_id = str(conv.id)

        message = Message(
            id=uuid4(),
            conversation_id=UUID(conv_id),
            role=role,
            content=content,
        )
        self.session.add(message)
        await self.session.flush()
        return conv_id, message

    async def get_messages(self, conversation_id: str) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == UUID(conversation_id))
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())

    async def delete(self, conversation: Conversation) -> None:
        await self.session.delete(conversation)
        await self.session.flush()

    async def delete_by_id_for_user(self, conversation_id: str, user_id: str) -> bool:
        conversation = await self.get_by_id_for_user(conversation_id, user_id)
        if conversation is None:
            return False

        await self.delete(conversation)
        return True

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
