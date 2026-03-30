from src.configs.config import config
from src.knowledge.base import (
    BaseGraphKnowledgeProvider,
    BaseKnowledgeFactory,
    BaseVectorKnowledgeProvider,
)
from src.knowledge.lightrag import get_lightrag_provider
from src.knowledge.milvus import get_milvus_provider


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
