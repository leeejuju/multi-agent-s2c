from typing import Any

from fastapi import APIRouter, HTTPException, status
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatAttachment(BaseModel):
    id: str
    file_name: str
    content_type: str
    access_url: str


class ChatRequest(BaseModel):
    input: str
    conversation_id: str | None = None
    attachments: list[ChatAttachment] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    content: str
    user_id: str
    agent_id: str
    conversation_id: str | None = None


def _build_human_message(payload: ChatRequest) -> HumanMessage:
    if not payload.attachments:
        return HumanMessage(content=payload.input)

    content_blocks: list[dict[str, Any]] = []
    if payload.input.strip():
        content_blocks.append({"type": "text", "text": payload.input})

    for attachment in payload.attachments:
        if attachment.content_type.startswith("image/"):
            content_blocks.append(
                {
                    "type": "image_url",
                    "image_url": {"url": attachment.access_url},
                }
            )

    return HumanMessage(content=content_blocks or payload.input)


def _extract_response_content(response: dict[str, Any]) -> str:
    messages = response.get("messages", [])
    if not messages:
        return ""

    last_message = messages[-1]
    content = getattr(last_message, "content", "")
    if isinstance(content, list):
        text_parts = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(part for part in text_parts if part)

    return str(content)


@router.post("/agent/{agent_id}/run", response_model=ChatResponse)
async def chat(
    agent_id: str,
    payload: ChatRequest,
    current_user: AuthenticatedUser,
):
    """Chat endpoint for authenticated users."""
    agent = agent_manager.get_agent(agent_id)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' was not found.",
        )

    response = await agent.stream_messages(
        {"messages": [_build_human_message(payload)]},
        config=payload.config,
    )
    return ChatResponse(
        content=_extract_response_content(response),
        user_id=current_user.user_id,
        agent_id=agent_id,
        conversation_id=payload.conversation_id,
    )
