from dataclasses import dataclass, field

from src.agents.base_context import BaseContext
from src.configs.config import config as sys_config


@dataclass
class SearchAgentContext(BaseContext):
    
    system_prompt: str = field(default=(""))
    
    sub_model: str = field(default=sys_config.flash_model)
    
    
    
