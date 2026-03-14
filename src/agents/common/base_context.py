from pydantic import BaseModel, Field
from dataclasses import dataclass, field
from configs.config import config as sys_config


@dataclass
class BaseContext(BaseModel):
    """
    基础上下文
    """

    system_prompt: str = ""
    tool: list = []

    model: str = Field(default=sys_config.default_model, description="默认模型")

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
