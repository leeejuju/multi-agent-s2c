import inspect
from functools import partial
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from src.configs import DEFAULT_BASE_MODEL_PROVIER
from src.configs.config import config
from src.knowledge.base import BaseGraphKnowledgeProvider, KnowledgeDocument

_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class LightRAGKnowledgeProvider(BaseGraphKnowledgeProvider):
    provider_name = "lightrag"

    def __init__(self) -> None:
        self._client: Any | None = None

    def _verify_required_settings(self) -> None:
        if not config.lightrag_working_dir:
            raise RuntimeError("LIGHTRAG_WORKING_DIR is required for LightRAG.")
        if not self._resolve_model_spec(
            config.lightrag_embedding_model or config.embed_model,
            fallback="dashscope/text-embedding-v4",
        ):
            raise RuntimeError("LIGHTRAG_EMBEDDING_MODEL or EMBED_MODEL is required.")

    def _load_client_class(self) -> type[Any]:
        try:
            from lightrag import LightRAG
        except ImportError as exc:
            raise RuntimeError(
                "LightRAG is not installed. Install dependency 'lightrag-hku'."
            ) from exc
        return LightRAG

    def _resolve_working_dir(self) -> str:
        working_dir = Path(config.lightrag_working_dir)
        if not working_dir.is_absolute():
            working_dir = _PROJECT_ROOT / working_dir
        working_dir.mkdir(parents=True, exist_ok=True)
        return str(working_dir)

    def _resolve_model_spec(
        self,
        model_spec: str | None,
        *,
        fallback: str | None = None,
    ) -> tuple[str, str, str] | None:
        resolved_spec = (model_spec or fallback or "").strip()
        if not resolved_spec:
            return None
        if "/" not in resolved_spec:
            raise RuntimeError(
                f"Model spec must use '<provider>/<model>' format: {resolved_spec}"
            )

        provider_name, model_name = resolved_spec.split("/", 1)
        provider_info = DEFAULT_BASE_MODEL_PROVIER.get(provider_name)
        if provider_info is None:
            raise RuntimeError(f"Unsupported model provider for LightRAG: {provider_name}")

        api_key = getattr(config, provider_info.api_key.lower(), "")
        if not api_key:
            raise RuntimeError(f"{provider_info.api_key} is required for LightRAG.")
        return model_name, provider_info.base_url, api_key

    def _build_llm_func(self) -> Any:
        from lightrag.llm.openai import openai_complete_if_cache

        model_name, base_url, api_key = self._resolve_model_spec(
            config.lightrag_llm_model,
            fallback=config.default_model,
        )

        async def complete(
            prompt: str,
            system_prompt: str | None = None,
            history_messages: list[dict[str, Any]] | None = None,
            keyword_extraction: bool = False,
            **kwargs: Any,
        ) -> str:
            return await openai_complete_if_cache(
                model_name,
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                base_url=base_url,
                api_key=api_key,
                keyword_extraction=keyword_extraction,
                **kwargs,
            )

        return complete

    def _build_embedding_func(self) -> Any:
        from lightrag.llm.openai import openai_embed, wrap_embedding_func_with_attrs

        model_name, base_url, api_key = self._resolve_model_spec(
            config.lightrag_embedding_model or config.embed_model,
            fallback="dashscope/text-embedding-v4",
        )

        async def embed(texts: list[str], **kwargs: Any) -> Any:
            return await openai_embed.func(
                texts,
                model=model_name,
                base_url=base_url,
                api_key=api_key,
                **kwargs,
            )

        return wrap_embedding_func_with_attrs(
            embedding_dim=config.lightrag_embedding_dim,
            max_token_size=config.lightrag_embedding_max_token_size,
            send_dimensions=True,
            model_name=model_name,
        )(partial(embed))

    def get_client(self) -> Any:
        if self._client is None:
            self._verify_required_settings()
            client_cls = self._load_client_class()
            self._client = client_cls(
                working_dir=self._resolve_working_dir(),
                workspace=config.lightrag_workspace,
                llm_model_func=self._build_llm_func(),
                llm_model_name=(
                    config.lightrag_llm_model or config.default_model
                ).split("/", 1)[-1],
                embedding_func=self._build_embedding_func(),
                embedding_func_max_async=config.search_max_concurrency,
                llm_model_max_async=config.search_max_concurrency,
            )
        return self._client

    async def ensure_ready(self) -> None:
        client = self.get_client()
        initializer = getattr(client, "initialize_storages", None)
        if callable(initializer):
            await initializer()
        try:
            from lightrag.kg.shared_storage import initialize_pipeline_status
        except ImportError:
            return
        await initialize_pipeline_status(workspace=config.lightrag_workspace)

    async def insert_documents(self, documents: list[KnowledgeDocument]) -> Any:
        #TODO 这里需要异步
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
        ids = [document.id for document in documents]
        file_paths = [
            str(document.metadata.get("file_path") or document.metadata.get("source") or "")
            for document in documents
        ]
        file_paths = [path or document.id for path, document in zip(file_paths, documents, strict=False)]
        result = insert_method(contents, ids=ids, file_paths=file_paths)
        if inspect.isawaitable(result):
            return await result
        return result

    async def query(self, text: str, **kwargs: Any) -> Any:
        try:
            from lightrag import QueryParam
        except ImportError as exc:
            raise RuntimeError(
                "LightRAG is not installed. Install dependency 'lightrag-hku'."
            ) from exc

        client = self.get_client()
        query_method = getattr(client, "aquery", None) or getattr(client, "query", None)
        if query_method is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LightRAG client does not support querying.",
            )

        allowed_query_param_keys = {
            field
            for field in getattr(QueryParam, "__dataclass_fields__", {})
            if field in kwargs
        }
        query_param_kwargs = {key: kwargs.pop(key) for key in allowed_query_param_keys}
        if "param" not in kwargs:
            kwargs["param"] = QueryParam(**query_param_kwargs)
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
