import inspect
from typing import Any

from src.configs.config import config
from src.knowledge.base import BaseKnowledge, KnowledgeRecord, KnowledgeSearch
from src.knowledge.store.milvus.config import (
    DEFAULT_RETRIEVAL_CONFIG,
    default_search_params,
)


class MilvusKnowledge(BaseKnowledge):
    def __init__(self) -> None:
        self._client: Any | None = None

    def _verify_required_settings(self) -> None:
        if not config.milvus.uri:
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
            client_kwargs: dict[str, Any] = {"uri": config.milvus.uri}
            if config.milvus.token:
                client_kwargs["token"] = config.milvus.token
            if config.milvus.db_name:
                client_kwargs["db_name"] = config.milvus.db_name
            self._client = client_cls(**client_kwargs)
        return self._client

    async def status(self) -> dict[str, Any]:
        self._verify_required_settings()
        return {
            "ready": True,
            "database": "milvus",
            "uri": config.milvus.uri,
            "db_name": config.milvus.db_name or None,
            "collection_name": DEFAULT_RETRIEVAL_CONFIG.collection_name,
            "index_type": DEFAULT_RETRIEVAL_CONFIG.index_type,
            "metric_type": DEFAULT_RETRIEVAL_CONFIG.metric_type,
            "top_k": DEFAULT_RETRIEVAL_CONFIG.top_k,
            "similarity_threshold": DEFAULT_RETRIEVAL_CONFIG.similarity_threshold,
        }

    async def upsert(self, records: list[KnowledgeRecord], **options: Any) -> Any:
        if not records:
            return []

        collection_name = self._resolve_collection_name(options)

        missing_vector_ids = [record.id for record in records if record.vector is None]
        if missing_vector_ids:
            raise RuntimeError(
                "Milvus upsert requires vector for every record: "
                + ", ".join(missing_vector_ids)
            )

        data = []
        for record in records:
            item = {
                "id": record.id,
                DEFAULT_RETRIEVAL_CONFIG.vector_field: record.vector,
                **record.metadata,
            }
            if record.content is not None:
                item["content"] = record.content
            data.append(item)

        return self.get_client().upsert(
            collection_name=collection_name,
            data=data,
            **options,
        )

    async def search(self, request: KnowledgeSearch) -> Any:
        if request.vector is None:
            raise RuntimeError("Milvus search requires vector.")

        options = dict(request.options)
        collection_name = self._resolve_collection_name(options)
        search_params = self._resolve_search_params(options)
        similarity_threshold = options.pop(
            "similarity_threshold",
            DEFAULT_RETRIEVAL_CONFIG.similarity_threshold,
        )
        anns_field = options.pop("anns_field", DEFAULT_RETRIEVAL_CONFIG.vector_field)
        limit = request.limit or DEFAULT_RETRIEVAL_CONFIG.top_k

        result = self.get_client().search(
            collection_name=collection_name,
            data=[request.vector],
            limit=limit,
            search_params=search_params,
            anns_field=anns_field,
            **options,
        )
        return self._filter_by_similarity_threshold(result, similarity_threshold)

    async def delete(self, ids: list[str], **options: Any) -> Any:
        if not ids:
            return []

        collection_name = self._resolve_collection_name(options)
        return self.get_client().delete(
            collection_name=collection_name,
            ids=ids,
            **options,
        )

    async def close(self) -> None:
        if self._client is None:
            return
        close_method = getattr(self._client, "close", None)
        if close_method is not None:
            result = close_method()
            if inspect.isawaitable(result):
                await result
        self._client = None

    def _resolve_collection_name(self, options: dict[str, Any]) -> str:
        collection_name = str(
            options.pop("collection_name", DEFAULT_RETRIEVAL_CONFIG.collection_name)
        ).strip()
        if not collection_name:
            raise RuntimeError("Milvus operation requires collection_name.")
        return collection_name

    def _resolve_search_params(self, options: dict[str, Any]) -> dict[str, Any]:
        search_params = default_search_params()
        supplied_search_params = options.pop("search_params", None)
        if supplied_search_params:
            search_params.update(supplied_search_params)

        metric_type = options.pop("metric_type", None)
        if metric_type:
            search_params["metric_type"] = metric_type

        params = options.pop("params", None)
        if params:
            search_params["params"] = {
                **search_params.get("params", {}),
                **params,
            }

        return search_params

    def _filter_by_similarity_threshold(
        self,
        result: Any,
        threshold: float | None,
    ) -> Any:
        if threshold is None:
            return result
        if not isinstance(result, list):
            return result

        filtered_batches = []
        for batch in result:
            if not isinstance(batch, list):
                filtered_batches.append(batch)
                continue

            filtered_batches.append(
                [
                    item
                    for item in batch
                    if self._extract_score(item) is None
                    or self._extract_score(item) >= threshold
                ]
            )
        return filtered_batches

    def _extract_score(self, item: Any) -> float | None:
        if not isinstance(item, dict):
            return None
        score = item.get("score", item.get("distance"))
        if score is None:
            return None
        try:
            return float(score)
        except (TypeError, ValueError):
            return None
