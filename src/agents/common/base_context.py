from dataclasses import dataclass, field

from src.configs import config as sys_config


@dataclass
class BaseContext:
    """
    基础上下文
    """

    system_prompt: str = ""
    
    tools: list = field(default_factory=list)

    model: str = field(default=sys_config.default_model)

    def update(self, data: dict):
        for key, value in data.items():
            if getattr(self, key):
                setattr(self, key, value)

    def get_context(self):
        pass

    def to_json(self):
        pass

    def sav_to_file(self):
        pass

    def load_from_file(self):
        pass
