from abc import abstractmethod

from .base_context import BaseContext


class BaseAgent:
    name: str = "base_agent"
    description: str = "底层代理"
    context: type[BaseContext] = BaseContext

    def __init__(self):
        pass

    @property
    def module_name(self):
        return self.__class__.__name__

    def id(self):
        return f"{self.module_name}_{self.name}"

    @abstractmethod
    def get_agent(self):
        """
        获取agent, 需子类重写
        """
        pass

    def stream(self, messages, context=None, **kwargs):
        """
        流式输出后处理
        """

        pass
