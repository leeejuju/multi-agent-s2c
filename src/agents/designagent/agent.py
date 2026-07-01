from deepagents.backends import StateBackend
from deepagents.middleware import SubAgentMiddleware
from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.base_agent import BaseAgent
from src.agents.subagents.searchagent import SearchAgent
from src.agents.utils.model_tool import load_model
from src.configs import config as sys_config

from .context import DesignAgentContext


class DesignAgent(BaseAgent):
    """Orchestrator不再持有tool,工具统一封装进subgent中"""
    
    name = "design_agent"
    description = "总设计师"
    context = DesignAgentContext

    def __init__(self):
        pass
    
    def _create_middlewares(self, context):
        """创建中间件"""
        pass
    

    def get_agent(self, context=None) -> CompiledStateGraph:
        search_agent = SearchAgent().get_agent()
        agent = create_agent(
            model=load_model(sys_config.default_model),
            tools=[],
            system_prompt=self.context.system_prompt,
            context_schema=context,
            checkpointer=self.get_checkpointer(),
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
