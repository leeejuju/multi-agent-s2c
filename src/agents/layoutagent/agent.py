from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import (
    ModelRetryMiddleware,
    SummarizationMiddleware,
    ToolCallLimitMiddleware,
)
from langgraph.graph.state import CompiledStateGraph

from src.agents.common import BaseAgent, load_model
from src.agents.common.tools import optimize_image_layout
from src.configs import config as sys_config

from .context import LayoutAgentContext


class LayoutAgent(BaseAgent):
    name = "layout_agent"
    description = "Optimizes image composition and produces generation-ready prompts."
    context = LayoutAgentContext

    def get_agent(self, context: Any = None) -> CompiledStateGraph[Any, Any, Any, Any]:
        flash_model = load_model(sys_config.flash_model)
        middleware: list[Any] = [
            ModelRetryMiddleware(max_retries=1, on_failure="continue"),
            ToolCallLimitMiddleware(run_limit=6, exit_behavior="continue"),
            SummarizationMiddleware(
                flash_model,
                trigger=("messages", 24),
                keep=("messages", 12),
            ),
        ]
        return create_agent(
            model=load_model(sys_config.default_model),
            tools=[optimize_image_layout],
            system_prompt=self.context.system_prompt,
            middleware=middleware,
        )
