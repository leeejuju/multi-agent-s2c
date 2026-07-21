"""项目自定义的人工审批中间件。"""

from collections.abc import Iterable

from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.agents.middleware.human_in_the_loop import InterruptOnConfig

from src.configs import config as system_cfg

# 从配置获取内置的审批工具
BUILTIN_TOOL = system_cfg.hil_approval_tools
FILTER_BUILTIN_TOOL = {
    tool_name: {"allowed_decisions": ["approve", "reject"]}
    for tool_name in BUILTIN_TOOL
}


class HumanInLoopMiddleware(HumanInTheLoopMiddleware):
    """暂停指定工具调用，等待人工批准或拒绝。"""

    def __init__(
        self,
        interrupt_on = FILTER_BUILTIN_TOOL,
        *,
        description_prefix: str = "当前工具执行需要人工审批",
    ) -> None:
        super().__init__(
            interrupt_on=interrupt_on,
            description_prefix=description_prefix,
        )


def create_hil_middleware(approve_mode: str = "trust"):
    if approve_mode == "always_trust":
        return None
    return HumanInLoopMiddleware
