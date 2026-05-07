from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import Conversation, Message


def _make_title(text: str, max_length: int = 80) -> str:
    title = text.split("\n")[0][:max_length].strip()
    return title if title else "新对话"


async def get_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == UUID(user_id),
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在。",
        )
    return conversation


async def list_conversations(
    db: AsyncSession,
    user_id: str,
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == UUID(user_id))
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


async def save_message(
    db: AsyncSession,
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
        db.add(conv)
        await db.flush()
        conv_id = str(conv.id)

    message = Message(
        id=uuid4(),
        conversation_id=UUID(conv_id),
        role=role,
        content=content,
    )
    db.add(message)
    await db.flush()
    return conv_id, message


async def get_messages(
    db: AsyncSession,
    conversation_id: str,
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == UUID(conversation_id))
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def delete_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> None:
    conversation = await get_conversation(db, conversation_id, user_id)
    await db.delete(conversation)
    await db.flush()
