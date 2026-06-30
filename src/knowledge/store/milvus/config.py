from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any

DEFAULT_COLLECTION_NAME = "knowledge"
DEFAULT_TOP_K = 10
DEFAULT_INDEX_TYPE = "AUTOINDEX"
DEFAULT_METRIC_TYPE = "COSINE"
DEFAULT_SIMILARITY_THRESHOLD: float | None = None
DEFAULT_VECTOR_FIELD = "vector"


def _default_index_params() -> dict[str, Any]:
    return {
        "index_type": DEFAULT_INDEX_TYPE,
        "metric_type": DEFAULT_METRIC_TYPE,
        "params": {},
    }
    



def _default_search_params() -> dict[str, Any]:
    return {
        "metric_type": DEFAULT_METRIC_TYPE,
        "params": {},
    }


@dataclass(frozen=True, slots=True)
class MilvusRetrievalConfig:
    collection_name: str = DEFAULT_COLLECTION_NAME
    top_k: int = DEFAULT_TOP_K
    index_type: str = DEFAULT_INDEX_TYPE
    metric_type: str = DEFAULT_METRIC_TYPE
    similarity_threshold: float | None = DEFAULT_SIMILARITY_THRESHOLD
    vector_field: str = DEFAULT_VECTOR_FIELD
    index_params: dict[str, Any] = field(default_factory=_default_index_params)
    search_params: dict[str, Any] = field(default_factory=_default_search_params)


DEFAULT_RETRIEVAL_CONFIG = MilvusRetrievalConfig()


def default_index_params() -> dict[str, Any]:
    return deepcopy(DEFAULT_RETRIEVAL_CONFIG.index_params)


def default_search_params() -> dict[str, Any]:
    return deepcopy(DEFAULT_RETRIEVAL_CONFIG.search_params)
