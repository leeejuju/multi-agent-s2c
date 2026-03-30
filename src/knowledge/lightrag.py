import inspect
from typing import Any

from fastapi import HTTPException, status

from src.configs.config import config
from src.knowledge.base import BaseGraphKnowledgeProvider, KnowledgeDocument


class LightRAGKnowledgeProvider(BaseGraphKnowledgeProvider):
    provider_name = "lightrag"

    def __init__(self) -> None:
        self._client: Any | None = None

    def _verify_required_settings(self) -> None:
        if not config.lightrag_working_dir:
            raise RuntimeError("LIGHTRAG_WORKING_DIR is required for LightRAG.")

    def _load_client_class(self) -> type[Any]:
        try:
            from lightrag import LightRAG
        except ImportError as exc:
            raise RuntimeError(
                "LightRAG is not installed. Install dependency 'lightrag-hku'."
            ) from exc
        return LightRAG

    def get_client(self) -> Any:
        if self._client is None:
            self._verify_required_settings()
            client_cls = self._load_client_class()
            self._client = client_cls(
                working_dir=config.lightrag_working_dir,
                workspace=config.lightrag_workspace,
            )
        return self._client

    async def ensure_ready(self) -> None:
        client = self.get_client()
        initializer = getattr(client, "initialize_storages", None)
        if callable(initializer):
            await initializer()

    async def insert_documents(self, documents: list[KnowledgeDocument]) -> Any:
        client = self.get_client()
        if not documents:
            return []

        insert_method = getattr(client, "ainsert", None) or getattr(client, "insert", None)
        if insert_method is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LightRAG client does not support document insertion.",
            )

        contents = [document.content for document in documents]
        result = insert_method(contents)
        if inspect.isawaitable(result):
            return await result
        return result

    async def query(self, text: str, **kwargs: Any) -> Any:
        client = self.get_client()
        query_method = getattr(client, "aquery", None) or getattr(client, "query", None)
        if query_method is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LightRAG client does not support querying.",
            )

        result = query_method(text, **kwargs)
        if inspect.isawaitable(result):
            return await result
        return result


_lightrag_instance: LightRAGKnowledgeProvider | None = None


def get_lightrag_provider() -> LightRAGKnowledgeProvider:
    global _lightrag_instance
    if _lightrag_instance is None:
        _lightrag_instance = LightRAGKnowledgeProvider()
    return _lightrag_instance
