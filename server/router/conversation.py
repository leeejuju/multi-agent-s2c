from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import AuthenticatedUser
from src.database import Conversation, get_db

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    title: str = "New Conversation"


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    summary: str | None = None


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateConversationRequest,
    current_user: AuthenticatedUser,
    session: AsyncSession = Depends(get_db),
):
    conversation = Conversation(
        user_id=UUID(current_user.user_id),
        title=payload.title.strip() or "New Conversation",
    )
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation
