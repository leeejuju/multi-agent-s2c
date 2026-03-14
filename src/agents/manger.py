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
        """get agent instance by id

        Args:
            agent_id (str): agent's name

        Returns:
            _type_: agent instance
        """
        if agent_id in self._instances:
            return self._instances[agent_id]


# if __name__ == "__main__":
#     instances = {}
#     agent_dir = Path(__file__).parent
#     for path in agent_dir.iterdir():
#         if path.is_dir() and path.name not in ("common", "__pycache__"):
#             agent_module = importlib.import_module(f"src.agents.{path.name}")
#             for name, obj in inspect.getmembers(agent_module):
#                 if inspect.isclass(obj) and issubclass(obj, BaseAgent):
#                     instances[name] = obj()
# print(instances)
