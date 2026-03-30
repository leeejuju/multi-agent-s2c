from fastapi import APIRouter, HTTPException, status

from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/agent/{agent_id}/run")
async def chat(agent_id: str, current_user: AuthenticatedUser):
    """Chat endpoint for authenticated users."""
    agent = agent_manager.get_agent(agent_id)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' was not found.",
        )
    response = await agent.stream({"messages": "hello"})
    return {
        "content": response["messages"][1].content,
        "user_id": current_user.user_id,
        "agent_id": agent_id,
    }
