from typing import Any

from src.configs.config import config
from src.knowledge.base import BaseVectorKnowledgeProvider, VectorRecord


class MilvusKnowledgeProvider(BaseVectorKnowledgeProvider):
    provider_name = "milvus"

    def __init__(self) -> None:
        self._client: Any | None = None

    def _verify_required_settings(self) -> None:
        if not config.milvus_uri:
            raise RuntimeError("MILVUS_URI is required for Milvus.")

    def _load_client_class(self) -> type[Any]:
        try:
            from pymilvus import MilvusClient
        except ImportError as exc:
            raise RuntimeError(
                "Milvus SDK is not installed. Install dependency 'pymilvus'."
            ) from exc
        return MilvusClient

    def get_client(self) -> Any:
        if self._client is None:
            self._verify_required_settings()
            client_cls = self._load_client_class()
            client_kwargs: dict[str, Any] = {"uri": config.milvus_uri}
            if config.milvus_token:
                client_kwargs["token"] = config.milvus_token
            if config.milvus_db_name:
                client_kwargs["db_name"] = config.milvus_db_name
            self._client = client_cls(**client_kwargs)
        return self._client

    async def ensure_ready(self) -> None:
        self.get_client()

    async def upsert_records(self, records: list[VectorRecord]) -> Any:
        client = self.get_client()
        if not records:
            return []

        raise RuntimeError(
            "Milvus upsert requires 'collection_name'. "
            "Use upsert_records_to_collection(collection_name, records) instead."
        )

    async def upsert_records_to_collection(
        self,
        collection_name: str,
        records: list[VectorRecord],
        **kwargs: Any,
    ) -> Any:
        client = self.get_client()
        if not records:
            return []

        data = [
            {
                "id": record.id,
                "vector": record.vector,
                **record.metadata,
            }
            for record in records
        ]
        return client.upsert(collection_name=collection_name, data=data, **kwargs)

    async def search(
        self,
        vector: list[float],
        *,
        limit: int = 10,
        **kwargs: Any,
    ) -> Any:
        collection_name = kwargs.pop("collection_name", "")
        if not collection_name:
            raise RuntimeError("Milvus search requires 'collection_name'.")

        client = self.get_client()
        return client.search(
            collection_name=collection_name,
            data=[vector],
            limit=limit,
            **kwargs,
        )


_milvus_instance: MilvusKnowledgeProvider | None = None


def get_milvus_provider() -> MilvusKnowledgeProvider:
    global _milvus_instance
    if _milvus_instance is None:
        _milvus_instance = MilvusKnowledgeProvider()
    return _milvus_instance
