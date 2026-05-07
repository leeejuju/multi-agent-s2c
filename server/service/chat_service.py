from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import Conversation, Message
from src.database.repositories import ConversationRepository


async def get_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Conversation:
    repository = ConversationRepository(session=db)
    conversation = await repository.get_by_id_for_user(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation


async def list_conversations(
    db: AsyncSession,
    user_id: str,
) -> list[Conversation]:
    repository = ConversationRepository(session=db)
    return await repository.list_by_user(user_id)


async def save_message(
    db: AsyncSession,
    role: str,
    content: str,
    conversation_id: str | None = None,
    user_id: str | None = None,
) -> tuple[str, Message]:
    repository = ConversationRepository(session=db)
    return await repository.save_message(
        role,
        content,
        conversation_id=conversation_id,
        user_id=user_id,
    )


async def get_messages(
    db: AsyncSession,
    conversation_id: str,
) -> list[Message]:
    repository = ConversationRepository(db)
    return await repository.get_messages(conversation_id)


async def delete_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> None:
    repository = ConversationRepository(db)
    conversation = await repository.get_by_id_for_user(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    await repository.delete(conversation)
    await db.commit()
