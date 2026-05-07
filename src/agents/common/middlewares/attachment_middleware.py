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


class AttachmentMiddleware(AgentMiddleware):

    async def abefore_model(self, state: AgentState, runtime: Any) -> dict[str, Any] | None:
        return None

    async def aafter_model(self, state: AgentState, runtime: Any) -> dict[str, Any] | None:
        return None

    async def abefore_agent(self, state: AgentState, runtime: Any) -> dict[str, Any] | None:
        return None

    async def aafter_agent(self, state: AgentState, runtime: Any) -> dict[str, Any] | None:
        return None

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler,
    ) -> ModelResponse | AIMessage | Any:
        return await handler(request)

    async def awrap_tool_call(
        self,
        request: ToolCallRequest,
        handler,
    ) -> ToolMessage | Command:
        return await handler(request)
