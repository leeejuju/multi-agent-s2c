from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.base_agent import BaseAgent
from src.agents.utils.model_tool import load_model
from src.configs import config as sys_config

from .context import ScenarioAgentContext


class ScenarioAgent(BaseAgent):
    name = "scenario_agent"
    description = "Writes screenplay scenes from an outline and character bible."
    context = ScenarioAgentContext
    agent_context = ScenarioAgentContext
    required_artifacts = ("outline", "character_bible")
    output_artifact = "scenario"

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
