from uuid import UUID, uuid4

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AgentRun, Conversation, Message


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
        status: str = "completed",
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
            status=status,
        )
        self.session.add(message)
        await self.session.flush()
        return conv_id, message

    async def update_message_content(
        self,
        message_id: str,
        content: str,
        *,
        status: str | None = None,
    ) -> Message | None:
        message = await self.session.get(Message, UUID(message_id))
        if message is None:
            return None
        message.content = content
        if status is not None:
            message.status = status
        await self.session.flush()
        return message

    async def append_message_content(
        self,
        message_id: str,
        delta: str,
        *,
        status: str | None = None,
    ) -> Message | None:
        message = await self.session.get(Message, UUID(message_id))
        if message is None:
            return None
        message.content = f"{message.content}{delta}"
        if status is not None:
            message.status = status
        await self.session.flush()
        return message

    async def set_message_status(self, message_id: str, status: str) -> Message | None:
        message = await self.session.get(Message, UUID(message_id))
        if message is None:
            return None
        message.status = status
        await self.session.flush()
        return message

    async def get_active_run_for_conversation(
        self,
        conversation_id: str,
        user_id: str,
    ) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun)
            .where(
                AgentRun.conversation_id == UUID(conversation_id),
                AgentRun.user_id == UUID(user_id),
                AgentRun.status.in_(("queued", "running", "canceling")),
            )
            .order_by(AgentRun.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_messages(self, conversation_id: str) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == UUID(conversation_id))
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())

    async def search_messages_for_user(
        self,
        *,
        user_id: str,
        query: str,
        limit: int = 5,
    ) -> list[tuple[Conversation, Message]]:
        pattern = f"%{query}%"
        result = await self.session.execute(
            select(Conversation, Message)
            .join(Message, Message.conversation_id == Conversation.id)
            .where(
                Conversation.user_id == UUID(user_id),
                or_(
                    Conversation.title.ilike(pattern),
                    Conversation.summary.ilike(pattern),
                    Message.content.ilike(pattern),
                ),
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.all())

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
