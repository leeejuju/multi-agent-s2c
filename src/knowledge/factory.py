from typing import Literal

from src.configs.config import config
from src.knowledge.base import (
    BaseGraphKnowledgeProvider,
    BaseKnowledgeFactory,
    BaseKnowledgeProvider,
    BaseVectorKnowledgeProvider,
)
from src.knowledge.lightrag import get_lightrag_provider
from src.knowledge.milvus import get_milvus_provider

KnowledgeProviderType = Literal[
    "graph",
    "milvus",
]


class GraphKnowledgeFactory(BaseKnowledgeFactory[BaseGraphKnowledgeProvider]):
    _providers = {"lightrag": get_lightrag_provider}

    @classmethod
    def create(cls, provider_name: str | None = None) -> BaseGraphKnowledgeProvider:
        resolved_provider = (provider_name or config.graph_knowledge_provider).lower()
        return super().create(resolved_provider)


class VectorKnowledgeFactory(BaseKnowledgeFactory[BaseVectorKnowledgeProvider]):
    _providers = {"milvus": get_milvus_provider}

    @classmethod
    def create(cls, provider_name: str | None = None) -> BaseVectorKnowledgeProvider:
        resolved_provider = (provider_name or config.vector_knowledge_provider).lower()
        return super().create(resolved_provider)


class KnowledgeFactory:
    """Create a concrete knowledge provider from a high-level knowledge type."""

    _supported_types = ("graph", "milvus")

    @classmethod
    def create(
        cls,
        knowledge_type: KnowledgeProviderType | str,
        provider_name: str | None = None,
    ) -> BaseKnowledgeProvider:
        normalized_type = cls._normalize_type(knowledge_type)
        if normalized_type == "graph":
            return GraphKnowledgeFactory.create(provider_name)
        if normalized_type == "milvus":
            resolved_provider = provider_name or "milvus"
            return VectorKnowledgeFactory.create(resolved_provider)

        supported = ", ".join(cls._supported_types)
        raise ValueError(
            f"Unsupported knowledge type: {knowledge_type}. "
            f"Supported types: {supported}."
        )

    @classmethod
    def _normalize_type(cls, knowledge_type: KnowledgeProviderType | str) -> str:
        key = str(knowledge_type).strip().lower().replace("-", "_")
        if not key:
            raise ValueError("Knowledge type cannot be empty.")
        if key not in cls._supported_types:
            supported = ", ".join(cls._supported_types)
            raise ValueError(
                f"Unsupported knowledge type: {knowledge_type}. "
                f"Supported types: {supported}."
            )
        return key
