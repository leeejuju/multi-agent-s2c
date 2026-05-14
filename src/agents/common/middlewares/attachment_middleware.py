from typing import Any

from langchain.agents.middleware.types import (
    AgentMiddleware,
    AgentState,
    ModelRequest,
    ModelResponse,
    ToolCallRequest,
)
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.types import Command
from typing_extensions import NotRequired


def _build_prompt_with_attachement(content: str):
    pass
    
    
    

class AttachmentState(AgentState):
    attachement:NotRequired[list[dict]] # 处理附件
    
    



class AttachmentMiddleware(AgentMiddleware):

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler,
    ) -> ModelResponse | AIMessage | Any:
        attachement = request.state.get("attachement", [])
        
        
        
        
