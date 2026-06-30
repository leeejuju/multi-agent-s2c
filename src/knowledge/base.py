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
    """Common database operations for all knowledge stores."""
    ...

    # @abstractmethod
    # async def status(self) -> dict[str, Any]:
    #     """Return database readiness and implementation details."""

    # @abstractmethod
    # async def upsert(self, records: list[KnowledgeRecord], **options: Any) -> Any:
    #     """Insert or update records in the knowledge store."""

    # @abstractmethod
    # async def search(self, request: KnowledgeSearch) -> Any:
    #     """Search or query records from the knowledge store."""

    # @abstractmethod
    # async def delete(self, ids: list[str], **options: Any) -> Any:
    #     """Delete records from the knowledge store."""

    # async def close(self) -> None:
    #     """Release database client resources when supported."""
