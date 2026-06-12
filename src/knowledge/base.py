from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, ClassVar, Generic, TypeVar


@dataclass(slots=True)
class KnowledgeDocument:
    id: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class VectorRecord:
    id: str
    vector: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseKnowledgeProvider(ABC):
    provider_name: str


class BaseGraphKnowledgeProvider(BaseKnowledgeProvider, ABC):
    @abstractmethod
    async def insert_documents(self, documents: list[KnowledgeDocument]) -> Any:
        """Insert or index graph-oriented knowledge documents."""

    @abstractmethod
    async def query(self, text: str, **kwargs: Any) -> Any:
        """Run a graph-aware knowledge query."""


class BaseVectorKnowledgeProvider(BaseKnowledgeProvider, ABC):
    @abstractmethod
    async def upsert_records(self, records: list[VectorRecord]) -> Any:
        """Insert or update vector records."""

    @abstractmethod
    async def search(
        self,
        vector: list[float],
        *,
        limit: int = 10,
        **kwargs: Any,
    ) -> Any:
        """Search the vector store using a dense vector."""


ProviderT = TypeVar("ProviderT", bound=BaseKnowledgeProvider)


class BaseKnowledgeFactory(ABC, Generic[ProviderT]):
    _providers: ClassVar[dict[str, Callable[[], ProviderT]]] = {}

    @classmethod
    def register_provider(
        cls,
        provider_name: str,
        provider_factory: Callable[[], ProviderT],
    ) -> None:
        normalized_name = cls._normalize_provider_name(provider_name)
        cls._providers[normalized_name] = provider_factory

    @classmethod
    def provider_names(cls) -> tuple[str, ...]:
        return tuple(sorted(cls._providers))

    @classmethod
    def create(cls, provider_name: str) -> ProviderT:
        normalized_name = cls._normalize_provider_name(provider_name)
        provider_factory = cls._providers.get(normalized_name)
        if provider_factory is None:
            supported = ", ".join(cls.provider_names()) or "none"
            raise ValueError(
                f"Unsupported knowledge provider: {provider_name}. "
                f"Supported providers: {supported}."
            )
        return provider_factory()