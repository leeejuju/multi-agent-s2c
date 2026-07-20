"""项目自定义的人工审批中间件。"""

from collections.abc import Iterable

from langchain.agents.middleware import (
    HumanInTheLoopMiddleware as LangChainHumanInTheLoopMiddleware,
)
from langchain.agents.middleware.human_in_the_loop import InterruptOnConfig


class HumanInLoopMiddleware(LangChainHumanInTheLoopMiddleware):
    """暂停指定工具调用，等待人工批准或拒绝。"""

    def __init__(
        self,
        approval_tools: str | Iterable[str],
        *,
        description_prefix: str = "工具执行需要人工审批",
    ) -> None:
        tool_names = (
            (approval_tools,)
            if isinstance(approval_tools, str)
            else tuple(dict.fromkeys(approval_tools))
        )
        if not tool_names:
            raise ValueError("approval_tools 至少需要包含一个工具名称")

        interrupt_on: dict[str, InterruptOnConfig] = {
            tool_name: {"allowed_decisions": ["approve", "reject"]}
            for tool_name in tool_names
        }
        super().__init__(
            interrupt_on=interrupt_on,
            description_prefix=description_prefix,
        )
