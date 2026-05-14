from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Iterator


@dataclass(slots=True)
class AgentRuntimeContext:
    user_id: str | None = None
    conversation_id: str | None = None
    attachments: list[dict[str, Any]] = field(default_factory=list)


_runtime_context: ContextVar[AgentRuntimeContext] = ContextVar(
    "agent_runtime_context",
    default=AgentRuntimeContext(),
)


def get_agent_runtime_context() -> AgentRuntimeContext:
    return _runtime_context.get()


@contextmanager
def agent_runtime_context(
    context: AgentRuntimeContext,
) -> Iterator[AgentRuntimeContext]:
    token = _runtime_context.set(context)
    try:
        yield context
    finally:
        _runtime_context.reset(token)
