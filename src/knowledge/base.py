from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class KnowledgeRecord:
    id: str
    content: str | None = None
    vector: list[float] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class KnowledgeSearch:
    query: str | None = None
    vector: list[float] | None = None
    limit: int = 10
    options: dict[str, Any] = field(default_factory=dict)


class BaseKnowledge(ABC):
    """定义知识库的基本行为和通用函数"""
    ...
