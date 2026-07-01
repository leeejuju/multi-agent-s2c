from typing import Any, NotRequired

from langchain.agents.middleware.types import (
    AgentMiddleware,
    AgentState,
    ModelRequest,
    ModelResponse,
)
from langchain.messages import AIMessage


def _build_prompt_with_attachement(attachement: list[dict]):
    pass
    
    
    

class AttachmentState(AgentState):
    attachement: NotRequired[list[dict]] # 处理附件
    
    



class AttachmentMiddleware(AgentMiddleware):

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler,
    ) -> ModelResponse | AIMessage | Any:
        pass
    
        # attachement: list[dict] = request.state.get("attachement", [])
        
        
        
        
