from __future__ import annotations

import unicodedata
from collections.abc import Iterable, Sequence
from typing import Any

from sklearn.cluster import AgglomerativeClustering
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_distances
from sklearn.mixture import GaussianMixture

from ..common import normalize_text


def cluster_texts_gmm(
    texts: Sequence[str],
    *,
    max_clusters: int = 50,
    probability_threshold: float = 0.1,
    reduced_dimensions: int = 10,
    ngram_size: int = 2,
    random_state: int = 0,
) -> list[list[int]]:
    """使用 GMM 对降维后的文本向量进行 soft clustering。"""
    _validate_positive_integer(max_clusters, name="max_clusters")
    _validate_probability_threshold(probability_threshold)
    _validate_positive_integer(reduced_dimensions, name="reduced_dimensions")

    text_count, source_indexes, vectors = _build_tfidf_vectors(
        texts,
        ngram_size=ngram_size,
    )
    if vectors is None:
        return _singleton_clusters(text_count)
    if len(source_indexes) == 1:
        return _labels_to_clusters(text_count, source_indexes, [0])

    reduced_vectors = _reduce_vectors(
        vectors,
        dimensions=reduced_dimensions,
        random_state=random_state,
    )
    model = _fit_optimal_gmm(
        reduced_vectors,
        max_clusters=max_clusters,
        random_state=random_state,
    )
    memberships: list[list[int]] = []
    for probabilities in model.predict_proba(reduced_vectors):
        labels = [
            label
            for label, probability in enumerate(probabilities)
            if probability >= probability_threshold
        ]
        memberships.append(labels or [int(probabilities.argmax())])

    return _memberships_to_clusters(
        text_count,
        source_indexes,
        memberships,
        n_clusters=model.n_components,
    )


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


def _reduce_vectors(
    vectors: Any,
    *,
    dimensions: int,
    random_state: int,
) -> Any:
    sample_count, feature_count = vectors.shape
    if feature_count <= dimensions:
        return vectors.toarray()

    n_components = min(dimensions, sample_count - 1, feature_count - 1)
    if n_components < 1:
        return vectors.toarray()
    return TruncatedSVD(
        n_components=n_components,
        random_state=random_state,
    ).fit_transform(vectors)


def _fit_optimal_gmm(
    vectors: Any,
    *,
    max_clusters: int,
    random_state: int,
) -> GaussianMixture:
    unique_vector_count = len({tuple(vector) for vector in vectors})
    candidate_limit = min(
        max_clusters,
        max(1, len(vectors) - 1),
        unique_vector_count,
    )
    models = [
        GaussianMixture(
            n_components=n_components,
            random_state=random_state,
        ).fit(vectors)
        for n_components in range(1, candidate_limit + 1)
    ]
    return min(models, key=lambda model: model.bic(vectors))


def _validate_similarity_threshold(similarity_threshold: float) -> None:
    if not 0 < similarity_threshold <= 1:
        raise ValueError("similarity_threshold 必须大于 0 且不大于 1")


def _validate_probability_threshold(probability_threshold: float) -> None:
    if not 0 < probability_threshold <= 1:
        raise ValueError("probability_threshold 必须大于 0 且不大于 1")


def _validate_positive_integer(value: int, *, name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{name} 必须是大于 0 的整数")


def _validate_n_clusters(n_clusters: int) -> None:
    _validate_positive_integer(n_clusters, name="n_clusters")


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


def _memberships_to_clusters(
    text_count: int,
    source_indexes: Sequence[int],
    memberships: Sequence[Sequence[int]],
    *,
    n_clusters: int,
) -> list[list[int]]:
    clusters = [[] for _ in range(n_clusters)]
    for source_index, labels in zip(source_indexes, memberships, strict=True):
        for label in labels:
            clusters[label].append(source_index)

    clustered_source_indexes = set(source_indexes)
    nonempty_clusters = [cluster for cluster in clusters if cluster]
    nonempty_clusters.extend(
        [index]
        for index in range(text_count)
        if index not in clustered_source_indexes
    )
    return nonempty_clusters


def _singleton_clusters(text_count: int) -> list[list[int]]:
    return [[index] for index in range(text_count)]


def _normalize_for_clustering(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", normalize_text(text)).casefold()
    return "".join(character for character in normalized if character.isalnum())


__all__ = [
    "cluster_texts_gmm",
    "cluster_texts_agglomerative",
]
