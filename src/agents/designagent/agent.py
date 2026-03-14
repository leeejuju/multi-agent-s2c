from langchain.agents import create_agent
from langgraph.graph.state import CompiledStateGraph
from src.agents.common import BaseAgent, load_model
from src.configs import config as sys_config

from .context import DesignAgentContext


class DesignAgent(BaseAgent):

    name = "design_agent"
    description = "你是一名经验丰富的UI设计师，尤其擅长图片内容的设计"
    context = DesignAgentContext

    def __init__(self):
        pass

    def get_agent(self) -> CompiledStateGraph:
        # 需要结合上下文
        agent = create_agent(
            model=load_model(sys_config.default_model),
            system_prompt=self.context.system_prompt,
        )
        return agent
