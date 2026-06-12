from dataclasses import dataclass, field

from src.agents.base_context import BaseContext
from src.configs.config import config as sys_config


@dataclass
class LayoutAgentContext(BaseContext):
    system_prompt: str = field(
        default=(
            "You are LayoutAgent, a visual composition and image prompt assistant. "
            "Turn creative briefs and references into structured composition plans, visual "
            "hierarchy notes, and generation prompts. Do not call any image-generation API; "
            "return actionable layout guidance and prompt text only."
        )
    )
    model: str = field(default=sys_config.default_model)
