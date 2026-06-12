import importlib
import inspect
from pathlib import Path
from types import ModuleType

from src.agents.base_agent import BaseAgent


class AgentManager:
    def __init__(self) -> None:
        self._instances: dict[str, BaseAgent] = {}
        self._setup_agent()

    def _setup_agent(self) -> None:
        agent_dir = Path(__file__).parent
        for path in agent_dir.iterdir():
            if not path.is_dir():
                continue
            if path.name in {"__pycache__", "middlewares", "utils", "subagent", "sandbox"}:
                continue

            if path.name == "subagents":
                for sub_path in path.iterdir():
                    if not sub_path.is_dir() or sub_path.name == "__pycache__":
                        continue
                    module = importlib.import_module(
                        f"src.agents.subagents.{sub_path.name}"
                    )
                    self._register_agents_from_module(module)
                continue

            module = importlib.import_module(f"src.agents.{path.name}")
            self._register_agents_from_module(module)

    def _register_agents_from_module(self, module: ModuleType) -> None:
        for name, obj in inspect.getmembers(module):
            if (
                inspect.isclass(obj)
                and obj is not BaseAgent
                and issubclass(obj, BaseAgent)
            ):
                self._instances[name] = obj()

    def get_agent(self, agent_id: str) -> BaseAgent:
        if agent_id in self._instances:
            return self._instances[agent_id]
        raise KeyError(f"Unknown agent: {agent_id}")

    def list_agents(self) -> list[dict[str, str]]:
        return [
            {
                "id": agent_id,
                "name": agent.name,
                "description": agent.description,
            }
            for agent_id, agent in sorted(self._instances.items())
        ]


agent_manager = AgentManager()

__all__ = ["agent_manager"]
