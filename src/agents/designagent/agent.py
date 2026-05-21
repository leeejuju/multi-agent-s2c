from deepagents.backends import StateBackend
from deepagents.middleware import SubAgentMiddleware
from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.common import BaseAgent, load_model
from src.agents.searchagent import SearchAgent
from src.configs import config as sys_config

from .context import DesignAgentContext


class DesignAgent(BaseAgent):
    name = "design_agent"
    description = "总设计师"
    context = DesignAgentContext

    def __init__(self):
        pass

    def get_agent(self, context=None) -> CompiledStateGraph:
        search_agent = SearchAgent().get_agent()
        agent = create_agent(
            model=load_model(sys_config.default_model),
            tools=[],
            system_prompt=self.context.system_prompt,
            context_schema=context,
            middleware=[
                SubAgentMiddleware(
                    backend=StateBackend(),
                    subagents=[
                        {
                            "name": "search_agent",
                            "description": (
                                "Use this agent when the creative task needs "
                                "reference search, fact checking, style research, "
                                "or evidence synthesis. It plans the search, "
                                "checks whether the results satisfy the request, "
                                "and returns structured guidance for DesignAgent."
                            ),
                            "runnable": search_agent,
                        }
                    ],
                ),
                ModelRetryMiddleware(max_retries=1, on_failure="continue"),
            ],
        )
        return agent
