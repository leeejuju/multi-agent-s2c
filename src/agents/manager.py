import inspect
import importlib
from pathlib import Path
from src.agents.common import BaseAgent


class AgentManager:

    def __init__(self):
        self._instances = {}
        self._setup_agent()

    def _setup_agent(self):
        agent_dir = Path(__file__).parent
        for path in agent_dir.iterdir():
            if path.is_dir() and path.name not in ("common", "__pycache__"):
                agent_module = importlib.import_module(f"src.agents.{path.name}")
                for name, obj in inspect.getmembers(agent_module):
                    if inspect.isclass(obj) and issubclass(obj, BaseAgent):
                        self._instances[name] = obj()

    def get_agent(self, agent_id: str) -> BaseAgent:
        """通过 ID 获取智能体实例。
        
        参数:
            agent_id (str): 智能体名称
            
        返回:
            BaseAgent: 智能体实例
        """
        if agent_id in self._instances:
            return self._instances[agent_id]


agent_manager = AgentManager()
__all__ = ["agent_manager"]
    
if __name__ == "__main__":
    pass