import uuid
from dataclasses import dataclass, field

from src.configs import config as sys_config


@dataclass(kw_only=True)
class BaseContext:
    """
    基础上下文
    """

    system_prompt: str = field(default="", metadata={"description": "系统提示词"})

    uid: str = field(
        default=lambda: str(uuid.uuid4()), metadata={"description": "用户id"}
    )
    
    thread_id: str = field(
            default=lambda: str(uuid.uuid4()), metadata={"description": "对话id"}
        )
    
    tools: list = field(default_factory=list, metadata={"description": "工具集合"})

    model: str = field(default="", metadata={"description": "agent使用的模型"})
    
    mcps: list[str] = field(default="", metadata={"description": "mcp工具"})
    
    style_profolio: dict = field(default_factory=dict, metadata={"description": "素材，算是吧"})
    
    def update_context(self, context:dict):
        "更新前端覆盖的参数"
        for k, v in context.items():
            if hasattr(self, k):
                setattr(self, k, v)

