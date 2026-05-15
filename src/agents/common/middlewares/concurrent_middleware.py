from langchain.agents.middleware import (
    AgentMiddleware,
    AgentState,
    ExtendedModelResponse,
    ModelRequest,
    ModelResponse,
)


class ConcurrentMiddleware(AgentMiddleware):

    def abefore_agent(self, state, runtime):
        state.get
        

