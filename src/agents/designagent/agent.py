from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.common import BaseAgent, load_model
from src.agents.common.tools import optimize_image_layout, search_references
from src.configs import config as sys_config

from .context import DesignAgentContext


class DesignAgent(BaseAgent):

    name = "design_agent"
    description = "你是一名经验丰富的UI设计师，尤其擅长图片内容的设计"
    context = DesignAgentContext

    def __init__(self):
        pass

    def get_agent(self, context = None) -> CompiledStateGraph:
        agent = create_agent(
            model=load_model(sys_config.default_model),
            tools=[search_references, optimize_image_layout],
            system_prompt=self.context.system_prompt,
            context_schema=context,
            middleware=[
                ToolRetryMiddleware(max_retries=1, on_failure="continue"),
                ModelRetryMiddleware(max_retries=1, on_failure="continue"),
            ],
        )
        return agent
