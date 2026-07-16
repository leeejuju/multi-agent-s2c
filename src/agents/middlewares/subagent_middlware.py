"""通过 ``task`` 工具调用子 Agent Run 接口。"""

from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import fields
from typing import Any

from langchain.agents.middleware.types import (
    AgentMiddleware,
    ModelRequest,
    ModelResponse,
)
from langchain.tools import ToolRuntime
from langchain_core.messages import ContentBlock, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool, StructuredTool
from langgraph.types import Command
from pydantic import BaseModel, Field

from src.agents.base_agent import BaseAgent
from src.agents.base_context import BaseContext

SUBAGENT_SYSTEM_PROMPT = """你可以使用 `task` 工具把独立任务提交给子 Agent。
`task` 会等待子 Agent 执行完毕，然后返回它的结果。
"""

type SubagentRun = Callable[
    [dict[str, Any]],
    Awaitable[Mapping[str, Any]],
]


class TaskInput(BaseModel):
    description: str = Field(description="简短任务说明")
    prompt: str = Field(description="子 Agent 的完整任务提示词")
    subagent_type: str = Field(description="要使用的子 Agent 名称")


def _context_dict(context: BaseContext | Mapping[str, Any] | None) -> dict[str, Any]:
    if context is None:
        return {}
    if isinstance(context, Mapping):
        return dict(context)
    return {field.name: getattr(context, field.name) for field in fields(context)}


def _append_system_message(
    system_message: SystemMessage | None,
    text: str,
) -> SystemMessage:
    content_blocks: list[ContentBlock] = (
        list(system_message.content_blocks) if system_message else []
    )
    if content_blocks:
        text = f"\n\n{text}"
    content_blocks.append({"type": "text", "text": text})
    return SystemMessage(content_blocks=content_blocks)


class SubAgentMiddleware(AgentMiddleware[Any, Any, Any]):
    """给父 Agent 提供调用子 Run 并等待结果的 ``task`` 工具。"""

    def __init__(
        self,
        *,
        subagents: Sequence[BaseAgent],
        parent_context: BaseContext | Mapping[str, Any],
        subagent_run: SubagentRun,
        system_prompt: str | None = SUBAGENT_SYSTEM_PROMPT,
    ) -> None:
        super().__init__()
        if not subagents:
            raise ValueError("At least one subagent must be specified")

        self._subagents: dict[str, BaseAgent] = {}
        for subagent in subagents:
            if not isinstance(subagent, BaseAgent):
                raise TypeError("subagents must contain BaseAgent instances")
            if subagent.name in self._subagents:
                raise ValueError(f"Duplicate subagent name: {subagent.name}")
            self._subagents[subagent.name] = subagent

        self.parent_context = parent_context
        self.subagent_run = subagent_run
        self.subagent_names = frozenset(self._subagents)
        self.system_prompt = system_prompt
        self.tools: list[BaseTool] = [self._create_task_tool()]

    def _create_task_tool(self) -> BaseTool:
        available_agents = "\n".join(
            f"- {name}: {subagent.description}"
            for name, subagent in self._subagents.items()
        )

        async def task(
            description: str,
            prompt: str,
            subagent_type: str,
            runtime: ToolRuntime,
        ) -> Command:
            return await self._enqueue_task(
                description=description,
                prompt=prompt,
                subagent_type=subagent_type,
                runtime=runtime,
            )

        return StructuredTool.from_function(
            name="task",
            coroutine=task,
            description=f"提交子 Agent Run。可用子 Agent：\n{available_agents}",
            args_schema=TaskInput,
            infer_schema=False,
        )

    async def _enqueue_task(
        self,
        *,
        description: str,
        prompt: str,
        subagent_type: str,
        runtime: ToolRuntime,
    ) -> Command:
        _ = description
        if not runtime.tool_call_id:
            raise ValueError("Tool call ID is required")

        subagent = self._subagents.get(subagent_type)
        if subagent is None:
            return self._result(
                runtime,
                subagent_type,
                f"Unknown subagent: {subagent_type}",
                error=True,
            )

        run_id: str | None = None
        try:
            run_id, result = await self.enqueue(
                parent_run_id=self._parent_run_id(runtime),
                agent_id=subagent.name,
                prompt=prompt,
                thread_id=self._thread_id(runtime),
            )
        except Exception as exc:
            return self._result(
                runtime,
                subagent_type,
                f"Failed to enqueue subagent '{subagent_type}': {exc}",
                run_id=run_id,
                error=True,
            )

        return self._result(
            runtime,
            subagent_type,
            result,
            run_id=run_id,
        )

    async def enqueue(
        self,
        *,
        parent_run_id: str,
        agent_id: str,
        prompt: str,
        thread_id: str,
    ) -> tuple[str, str]:
        created_run = await self.subagent_run(
            {
                "query": prompt,
                "agent_id": agent_id,
                "thread_id": thread_id,
                "thread_metadata": {},
                "parent_run_id": parent_run_id,
            }
        )
        run_id = created_run.get("run_id")
        if not isinstance(run_id, str) or not run_id:
            raise ValueError("Agent Run API did not return run_id")

        # 延迟导入，避免 src.agents 初始化时反向加载 server.service。
        from server.service.agent_run_service import wait_agent_run_result

        return run_id, await wait_agent_run_result(run_id)

    def _parent_run_id(self, runtime: ToolRuntime) -> str:
        return self._context_id(runtime, "run_id", "parent run_id")

    def _thread_id(self, runtime: ToolRuntime) -> str:
        return self._context_id(runtime, "thread_id", "thread_id")

    def _context_id(
        self,
        runtime: ToolRuntime,
        key: str,
        label: str,
    ) -> str:
        context = _context_dict(self.parent_context)
        context.update(_context_dict(runtime.context))
        config = runtime.config or {}
        metadata = config.get("metadata", {})
        configurable = config.get("configurable", {})
        value = (
            context.get(key)
            or metadata.get(key)
            or configurable.get(key)
        )
        if not isinstance(value, str) or not value:
            raise ValueError(f"Missing {label}")
        return value

    @staticmethod
    def _result(
        runtime: ToolRuntime,
        subagent_type: str,
        content: str,
        *,
        run_id: str | None = None,
        error: bool = False,
    ) -> Command:
        if not runtime.tool_call_id:
            raise ValueError("Tool call ID is required")
        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content=content,
                        tool_call_id=runtime.tool_call_id,
                        name="task",
                        status="error" if error else "success",
                        additional_kwargs={
                            "subagent_name": subagent_type,
                            "subagent_run_id": run_id,
                            "subagent_status": "failed" if error else "completed",
                        },
                    )
                ]
            }
        )

    def wrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], ModelResponse[Any]],
    ) -> ModelResponse[Any]:
        if self.system_prompt is None:
            return handler(request)
        return handler(
            request.override(
                system_message=_append_system_message(
                    request.system_message,
                    self._system_prompt(),
                )
            )
        )

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[
            [ModelRequest[Any]],
            Awaitable[ModelResponse[Any]],
        ],
    ) -> ModelResponse[Any]:
        if self.system_prompt is None:
            return await handler(request)
        return await handler(
            request.override(
                system_message=_append_system_message(
                    request.system_message,
                    self._system_prompt(),
                )
            )
        )

    def _system_prompt(self) -> str:
        agents = "\n".join(
            f"- {name}: {subagent.description}"
            for name, subagent in self._subagents.items()
        )
        return f"{self.system_prompt}\n可用子 Agent：\n{agents}"
