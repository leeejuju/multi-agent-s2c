from pathlib import Path
from src.agents import BaseAgent


class AgentManger:

    def __init__(self):
        self._setup()
        self._instances = {}

    def _setup_agent(self):
        exclusive_file = [""]
        agent_dir = Path(__file__).parent

    def get_agent(self, agent_id: str) -> BaseAgent:
        """get agent instance by id

        Args:
            agent_id (str): agent's name

        Returns:
            _type_: agent instance
        """
        if agent_id in self._instances:
            return self._instances[agent_id]


if __name__ == "__main__":
    print(Path(__file__).parent)
