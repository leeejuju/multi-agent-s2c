from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.graph.state import CompiledStateGraph

from src.agents.base_agent import BaseAgent
from src.agents.middlewares.subagent_middlware import create_subagent_middleware
from src.agents.subagents.searchagent import SearchAgent
from src.agents.utils.model_tool import load_model
from src.configs import config as sys_config

from .context import LeaderAgentContext


class LeaderAgent(BaseAgent):
    """负责规划、委派并整合剧本与分镜创作任务的公开顶层 Agent。"""

    name = "leader_agent"
    description = "创作负责人"
    context = LeaderAgentContext
    agent_context = LeaderAgentContext

    def __init__(self):
        pass

    def _create_middlewares(self, context):
        return [
            create_subagent_middleware(
                subagents=[SearchAgent()],
                parent_context=context,
            ),
            ModelRetryMiddleware(max_retries=1, on_failure="continue"),
        ]

    def get_agent(self, context=None) -> CompiledStateGraph:
        runtime_context = context or self.context()
        return create_agent(
            model=load_model(runtime_context.model or sys_config.default_model),
            tools=[],
            system_prompt=runtime_context.system_prompt,
            context_schema=type(runtime_context),
            checkpointer=self.get_checkpointer(),
            middleware=self._create_middlewares(runtime_context),
        )
