from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar


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

    @abstractmethod
    async def ensure_ready(self) -> None:
        """Prepare the provider for requests."""


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
    _providers: dict[str, Any] = {}

    @classmethod
    def register_provider(cls, provider_name: str, provider_factory: Any) -> None:
        cls._providers[provider_name.lower()] = provider_factory

    @classmethod
    def create(cls, provider_name: str) -> ProviderT:
        provider_factory = cls._providers.get(provider_name.lower())
        if provider_factory is None:
            raise ValueError(f"Unsupported knowledge provider: {provider_name}")
        return provider_factory()
