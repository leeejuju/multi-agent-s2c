from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.base_agent import BaseAgent
from src.agents.utils.model_tool import load_model
from src.configs import config as sys_config

from .context import CharacterAgentContext


class CharacterAgent(BaseAgent):
    name = "character_agent"
    description = "Builds a character bible from an approved story outline."
    context = CharacterAgentContext
    agent_context = CharacterAgentContext
    required_artifacts = ("outline",)
    output_artifact = "character_bible"

    def get_agent(self, context=None) -> CompiledStateGraph:
        runtime_context = context or self.context()
        return create_agent(
            model=load_model(runtime_context.model or sys_config.default_model),
            tools=[],
            system_prompt=runtime_context.system_prompt,
            context_schema=type(runtime_context),
            checkpointer=self.get_checkpointer(),
            middleware=[ModelRetryMiddleware(max_retries=1, on_failure="continue")],
        )
