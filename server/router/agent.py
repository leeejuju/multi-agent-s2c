from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/chat", tags=["chat"])


class AgentRunRequest(BaseModel):
    agent_name: str = Field(..., description="要调用的 agent 名称")
    input: str = Field(..., description="输入内容")


class AgentRunResponse(BaseModel):
    agent_name: str = Field(..., description="执行的 agent 名称")
    output: str = Field(..., description="输出结果")


@router.post("/run")
async def agent_chat(request: AgentRunRequest):
    """调用指定 agent 执行任务"""
    # TODO: 根据 agent_name 查找并调用对应 agent
    return AgentRunResponse(
        agent_name=request.agent_name,
        output="not implemented",
    )
