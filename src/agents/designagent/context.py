from dataclasses import dataclass, field
from src.configs.config import config as sys_config
from src.agents.common.base_context import BaseContext


@dataclass
class DesignAgentContext(BaseContext):
    """控制

    Args:
        BaseContext (_type_): _description_
    """

    system_prompt: str = field(default="你是一个深度研究智能体")
    sub_model: str = field(default="dashscope/qwen3.5-plus")
    flash_model: str = field(default=sys_config.flash_model)
