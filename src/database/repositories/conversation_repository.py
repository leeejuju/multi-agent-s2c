from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Conversation, Message


def _make_title(text: str, max_length: int = 80) -> str:
    title = text.split("\n")[0][:max_length].strip()
    return title if title else "New conversation"


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, conversation_id: int | str) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.id == int(conversation_id))
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(
        self,
        conversation_id: str,
        user_id: str,
    ) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(
                Conversation.id == int(conversation_id),
                Conversation.uid == str(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: str) -> list[Conversation]:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.uid == int(user_id))
            .order_by(Conversation.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_conversation_by_thead_id(
        self,
        thread_id: str,
    ) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(Conversation.thread_id == thread_id)
        )
        return result.scalar_one_or_none()

    async def get_conversation_by_thread_id_for_user(
        self,
        thread_id: str,
        user_id: str,
    ) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(
                Conversation.thread_id == thread_id,
                Conversation.uid == str(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def create_conversation(
        self,
        uid: str,
        thread_id: str,
        agent_id:str,
        parent_conversation_id: int | None = None,
        title: str | None = None,
        summary: str | None = None,
        conversation_metadata: dict | None = None
    ) -> Conversation:
        conversation = Conversation(
            uid=uid,
            thread_id=thread_id,
            agent_id=agent_id,
            parent_conversation_id=parent_conversation_id,
            title=title,
            summary=summary,
            conversation_metadata = conversation_metadata
        )
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def create_message(
        self,
        *,
        conversation_id: int | str,
        role: str,
        content: str,
        agent_run_id: str | None = None,
        request_id: str | None = None,
        image_content: str | None = None,
        message_type: str = "text",
        status: str = "completed",
    ) -> Message:
        message = Message(
            conversation_id=int(conversation_id),
            agent_run_id=agent_run_id,
            role=role,
            content=content,
            image_content=image_content,
            request_id=request_id,
            message_type=message_type,
            status=status,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def get_agent_run_result(self, run_id: str) -> Message | None:
        result = await self.session.execute(
            select(Message)
            .where(
                Message.agent_run_id == run_id,
                Message.role == "assistant",
            )
            .order_by(Message.id.desc())
            .limit(1)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_message_by_id(self, message_id: int | str) -> Message | None:
        result = await self.session.execute(
            select(Message)
            .where(Message.id == int(message_id))
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def link_message_to_run(
        self,
        *,
        message_id: int | str,
        run_id: str,
    ) -> Message | None:
        message = await self.get_message_by_id(message_id)
        if message is None:
            return None
        message.agent_run_id = run_id
        await self.session.flush()
        return message

    async def save_message(
        self,
        role: str,
        content: str,
        conversation_id: str | None = None,
        user_id: str | None = None,
        agent_run_id: str | None = None,
        status: str = "completed",
    ) -> tuple[str, Message]:
        if conversation_id:
            conv_id = conversation_id
        else:
            conv = Conversation(
                user_id=int(user_id),
                title=_make_title(content),
            )
            self.session.add(conv)
            await self.session.flush()
            conv_id = str(conv.id)

        message = Message(
            conversation_id=int(conv_id),
            agent_run_id=int(agent_run_id) if agent_run_id is not None else None,
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
        message = await self.session.get(Message, int(message_id))
        if message is None:
            return None
        message.content = content  # ty:ignore[invalid-assignment]
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
        message = await self.session.get(Message, int(message_id))
        if message is None:
            return None
        message.content = f"{message.content}{delta}"
        if status is not None:
            message.status = status
        await self.session.flush()
        return message

    async def set_message_status(self, message_id: str, status: str) -> Message | None:
        message = await self.session.get(Message, int(message_id))
        if message is None:
            return None
        message.status = status
        await self.session.flush()
        return message

    async def get_messages(self, conversation_id: str) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == int(conversation_id))
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
