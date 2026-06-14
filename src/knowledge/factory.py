from typing import Literal

from src.knowledge.base import BaseKnowledge
from src.knowledge.store.milvus.milvus import MilvusKnowledge

KnowledgeType = Literal["milvus"]


class KnowledgeFactory:
    """Create knowledge stores by type."""

    _instances: dict[str, BaseKnowledge] = {}

    @classmethod
    def create(cls, knowledge_type: KnowledgeType | str) -> BaseKnowledge:
        normalized_type = cls.normalize_type(knowledge_type)
        if normalized_type not in cls._instances:
            cls._instances[normalized_type] = MilvusKnowledge()

        return cls._instances[normalized_type]

    @classmethod
    def supported_types(cls) -> tuple[str, ...]:
        return ("milvus",)

    @classmethod
    def database_name(cls, knowledge_type: KnowledgeType | str) -> str:
        cls.normalize_type(knowledge_type)
        return "milvus"

    @classmethod
    def clear_cache(cls, knowledge_type: KnowledgeType | str | None = None) -> None:
        if knowledge_type is None:
            cls._instances.clear()
            return
        cls.normalize_type(knowledge_type)
        cls._instances.pop("milvus", None)

    @classmethod
    def normalize_type(cls, knowledge_type: KnowledgeType | str) -> str:
        normalized_type = str(knowledge_type).strip().lower().replace("-", "_")
        if normalized_type != "milvus":
            supported = ", ".join(cls.supported_types())
            raise ValueError(
                f"Unsupported knowledge type: {knowledge_type}. "
                f"Supported types: {supported}."
            )
        return normalized_type
