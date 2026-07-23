from __future__ import annotations

import unicodedata
from collections.abc import Iterable, Sequence
from typing import Any

from sklearn.cluster import (
    DBSCAN,
    AgglomerativeClustering,
    KMeans,
    MiniBatchKMeans,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_distances

from ..common import normalize_text


def cluster_texts_dbscan(
    texts: Sequence[str],
    *,
    similarity_threshold: float = 0.6,
    ngram_size: int = 2,
) -> list[list[int]]:
    """使用 DBSCAN 按余弦相似度阈值聚类文本。"""
    _validate_similarity_threshold(similarity_threshold)
    text_count, source_indexes, vectors = _build_tfidf_vectors(
        texts,
        ngram_size=ngram_size,
    )
    if vectors is None:
        return _singleton_clusters(text_count)

    labels = DBSCAN(
        eps=max(1.0 - similarity_threshold, 1e-12),
        min_samples=1,
        metric="cosine",
        algorithm="brute",
    ).fit_predict(vectors)
    return _labels_to_clusters(text_count, source_indexes, labels)


def cluster_texts_kmeans(
    texts: Sequence[str],
    *,
    n_clusters: int,
    ngram_size: int = 2,
    random_state: int = 0,
) -> list[list[int]]:
    """使用 K-Means 按指定簇数聚类文本。"""
    _validate_n_clusters(n_clusters)
    text_count, source_indexes, vectors = _build_tfidf_vectors(
        texts,
        ngram_size=ngram_size,
    )
    if vectors is None:
        return _singleton_clusters(text_count)
    _validate_cluster_count(n_clusters, len(source_indexes))
    if len(source_indexes) == 1:
        return _labels_to_clusters(text_count, source_indexes, [0])

    labels = KMeans(
        n_clusters=n_clusters,
        random_state=random_state,
    ).fit_predict(vectors)
    return _labels_to_clusters(text_count, source_indexes, labels)


def cluster_texts_mini_batch_kmeans(
    texts: Sequence[str],
    *,
    n_clusters: int,
    ngram_size: int = 2,
    random_state: int = 0,
) -> list[list[int]]:
    """使用 MiniBatch K-Means 聚类较大批量的文本。"""
    _validate_n_clusters(n_clusters)
    text_count, source_indexes, vectors = _build_tfidf_vectors(
        texts,
        ngram_size=ngram_size,
    )
    if vectors is None:
        return _singleton_clusters(text_count)
    _validate_cluster_count(n_clusters, len(source_indexes))
    if len(source_indexes) == 1:
        return _labels_to_clusters(text_count, source_indexes, [0])

    labels = MiniBatchKMeans(
        n_clusters=n_clusters,
        random_state=random_state,
    ).fit_predict(vectors)
    return _labels_to_clusters(text_count, source_indexes, labels)


def cluster_texts_agglomerative(
    texts: Sequence[str],
    *,
    n_clusters: int | None = None,
    similarity_threshold: float = 0.6,
    ngram_size: int = 2,
) -> list[list[int]]:
    """使用层次聚类按指定簇数或余弦相似度阈值聚类文本。"""
    if n_clusters is None:
        _validate_similarity_threshold(similarity_threshold)
    else:
        _validate_n_clusters(n_clusters)

    text_count, source_indexes, vectors = _build_tfidf_vectors(
        texts,
        ngram_size=ngram_size,
    )
    if vectors is None:
        return _singleton_clusters(text_count)
    if n_clusters is not None:
        _validate_cluster_count(n_clusters, len(source_indexes))
    if len(source_indexes) == 1:
        return _labels_to_clusters(text_count, source_indexes, [0])

    distances = cosine_distances(vectors)
    if n_clusters is None:
        model = AgglomerativeClustering(
            n_clusters=None,
            metric="precomputed",
            linkage="average",
            distance_threshold=max(1.0 - similarity_threshold, 1e-12),
            compute_full_tree=True,
        )
    else:
        model = AgglomerativeClustering(
            n_clusters=n_clusters,
            metric="precomputed",
            linkage="average",
        )
    labels = model.fit_predict(distances)
    return _labels_to_clusters(text_count, source_indexes, labels)


def _build_tfidf_vectors(
    texts: Sequence[str],
    *,
    ngram_size: int,
) -> tuple[int, list[int], Any | None]:
    if isinstance(texts, str):
        raise TypeError("texts 必须是字符串序列，不能是单个字符串")
    if isinstance(ngram_size, bool) or not isinstance(ngram_size, int) or ngram_size < 1:
        raise ValueError("ngram_size 必须是大于 0 的整数")

    text_list = list(texts)
    if any(not isinstance(text, str) for text in text_list):
        raise TypeError("texts 中的每一项都必须是字符串")

    normalized_texts = [_normalize_for_clustering(text) for text in text_list]
    source_indexes = [index for index, text in enumerate(normalized_texts) if text]
    if not source_indexes:
        return len(text_list), [], None

    vectorizer = TfidfVectorizer(
        analyzer="char",
        ngram_range=(1, ngram_size),
        lowercase=False,
        sublinear_tf=True,
    )
    vectors = vectorizer.fit_transform(normalized_texts[index] for index in source_indexes)
    return len(text_list), source_indexes, vectors


def _validate_similarity_threshold(similarity_threshold: float) -> None:
    if not 0 < similarity_threshold <= 1:
        raise ValueError("similarity_threshold 必须大于 0 且不大于 1")


def _validate_n_clusters(n_clusters: int) -> None:
    if isinstance(n_clusters, bool) or not isinstance(n_clusters, int) or n_clusters < 1:
        raise ValueError("n_clusters 必须是大于 0 的整数")


def _validate_cluster_count(n_clusters: int, text_count: int) -> None:
    if n_clusters > text_count:
        raise ValueError("n_clusters 不能大于非空文本数量")


def _labels_to_clusters(
    text_count: int,
    source_indexes: Sequence[int],
    labels: Iterable[int],
) -> list[list[int]]:
    cluster_keys: list[int | None] = [None] * text_count
    for source_index, label in zip(source_indexes, labels, strict=True):
        cluster_keys[source_index] = int(label)

    next_cluster_key = (
        max(
            (key for key in cluster_keys if key is not None),
            default=-1,
        )
        + 1
    )
    for index, key in enumerate(cluster_keys):
        if key is None:
            cluster_keys[index] = next_cluster_key
            next_cluster_key += 1

    clusters: dict[int, list[int]] = {}
    for index, key in enumerate(cluster_keys):
        assert key is not None
        clusters.setdefault(key, []).append(index)
    return list(clusters.values())


def _singleton_clusters(text_count: int) -> list[list[int]]:
    return [[index] for index in range(text_count)]


def _normalize_for_clustering(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", normalize_text(text)).casefold()
    return "".join(character for character in normalized if character.isalnum())


__all__ = [
    "cluster_texts_agglomerative",
    "cluster_texts_dbscan",
    "cluster_texts_kmeans",
    "cluster_texts_mini_batch_kmeans",
]
