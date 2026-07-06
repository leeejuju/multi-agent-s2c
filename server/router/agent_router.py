from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import AuthenticatedUser
from src.database import get_db
from src.database.models import Message, User
from src.database.repositories import AgentRunRepository, ConversationRepository

agent_router = APIRouter(prefix="/agent", tags=["agent_router"])


class AgentCreateRequest(BaseModel):
    # TODO 根据Agent字段创建 Agent创建实例
    pass
    

class AgentRunCreateRequest(BaseModel):
    query: str | None = Field(default=None, description="问题")
    agent_id: str = Field(default=..., description="agent的name")
    thread_id: str = Field(default=..., description="对话thraed_id")
    thread_metadata: dict = Field(default_factory=dict, description="附带参数")
    image_content: str | None = Field(None, description="图像文件")
    # model: str = Field(None, description="自选模型")
    is_resume: Any | None = Field(None, description="resume选项，用于特殊如Hil")
    parent_run_id: str | None = Field(None, description="父事件id,没有就自己的id")
    

@agent_router.post("")
def create_agen():
    """用户自己的创建智能体"""
    # TODO 待做，不需要也可，因为很多人不知道怎么才算合格
    pass


@agent_router.post("/runs")
async def crete_agent_run(agentrun_request: AgentRunCreateRequest,
                    current_user: AuthenticatedUser,
                    db:AsyncSession = Depends(get_db)):
    """解耦对话的设计，这里创建消息事件流，前端只需拿着事件流去消费就可以。记住每次的新消息(上一事件完结后)
    都是做新的agent event id 以及 request_id,每次都是
    
    """
    
    query = agentrun_request.query
    thread_id = agentrun_request.thread_id
    agent_id = agentrun_request.agent_id 
    thread_meatadata = agentrun_request.thread_metadata
    is_resume = agentrun_request.is_resume
    parent_run_id = agentrun_request.parent_run_id
    
    current_uid = current_user.uid
    
    conv_repo = ConversationRepository(db)
    
    if thread_meatadata.get("reuqest_id"):
        reuqest_id: str = thread_meatadata.get("reuqest_id")  
    else:
        reuqest_id = str(uuid.uuid4())
        
    
    # TODO 创建 agent run 的
    if not thread_id:
        raise HTTPException(status_code=404, detail="会话id不可为空")
    
    conv_result = await conv_repo.get_conversation_by_thead_id(thread_id=thread_id)
    
    if not conv_result or conv_result.uid != current_uid:
        raise HTTPException(status_code=404, detail="当前会话不存在或已删除")
    
    user_result = await db.execute(select(User).where(User.uid == str(current_uid)))
    
    if user_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # TODO 这里需要去解决创建事件的竞态问题，但是原型阶段不做任何防御和解决
    msg = Message(
        conversation_id=conv_result.id,
        role="user",
        content=query or "",
        status="completed"
    )
    db.add(msg)
    await db.flush()
    
    # 存入消息后创建 run 记录
    run_repo = AgentRunRepository(db)
    run_id = str(uuid.uuid4())
    
    async with db.begin_nested():
        run = await run_repo.create_agent_run(
            run_id=run_id,
            thread_id=thread_id,
            conversation_id=conv_result.id,
            uid=current_uid,
            agent_id=agent_id,
            request_id=reuqest_id,
            parent_run_id=parent_run_id
            
        )
    await db.commit()

    return {
        "run_id": run.id,
        "thread_id": run.thread_id,
        "status": run.status,
        "request_id": run.request_id,
        "stream_url": f"/api/agent/runs/{run.id}/events",
    }

    
@agent_router.get("/runs/{run_id}/events")        
async def stream_run_event(
    run_id: str,
    current_user: AuthenticatedUser,
):
    return StreamingResponse()

    

    
    

    
    
    
    
    
    
    
    
        
        
    
    

    
        
      

    
    
    
    
    
    

    
    
    
    
    
    
    
