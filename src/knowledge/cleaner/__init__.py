from __future__ import annotations

from pathlib import Path

from .common import (
    has_headings,
    looks_like_law,
    looks_like_paper,
    looks_like_qa,
    looks_like_table,
    normalize_text,
)
from .laws import clean_laws
from .naive import clean_naive
from .paper import clean_paper
from .qa import clean_qa
from .table import clean_table
from .title import clean_by_titles
from .types import CleanedChunk, CleanResult

PROFILE_ALIASES = {
    "book": "title",
    "email": "naive",
    "manual": "title",
    "naive": "naive",
    "paper": "paper",
    "presentation": "title",
    "qa": "qa",
    "question_answer": "qa",
    "resume": "title",
    "laws": "laws",
    "law": "laws",
    "table": "table",
    "title": "title",
}


def clean_document_text(
    text: str,
    *,
    file_name: str | None = None,
    content_type: str | None = None,
    profile: str | None = None,
    chunk_size: int = 1200,
) -> CleanResult:
    normalized = normalize_text(text)
    selected_profile = resolve_profile(
        normalized,
        file_name=file_name,
        content_type=content_type,
        profile=profile,
    )

    if not normalized:
        return CleanResult(markdown="", chunks=[], profile=selected_profile)

    cleaners = {
        "qa": clean_qa,
        "table": clean_table,
        "paper": clean_paper,
        "laws": clean_laws,
        "title": clean_by_titles,
        "naive": clean_naive,
    }
    chunks = cleaners[selected_profile](normalized, chunk_size=chunk_size)
    if not chunks:
        chunks = clean_naive(normalized, chunk_size=chunk_size)

    return CleanResult(
        markdown="\n\n".join(chunk.content for chunk in chunks),
        chunks=chunks,
        profile=selected_profile,
    )


def resolve_profile(
    text: str,
    *,
    file_name: str | None,
    content_type: str | None,
    profile: str | None,
) -> str:
    if profile:
        resolved = PROFILE_ALIASES.get(profile.lower().strip())
        if resolved:
            return resolved

    extension = Path(file_name or "").suffix.lower()
    normalized_content_type = (content_type or "").lower()
    if extension in {".csv", ".tsv", ".xls", ".xlsx"} or "csv" in normalized_content_type:
        return "table"
    if looks_like_table(text):
        return "table"
    if looks_like_qa(text):
        return "qa"
    if looks_like_paper(text):
        return "paper"
    if looks_like_law(text):
        return "laws"
    if has_headings(text):
        return "title"
    return "naive"


def _demo() -> None:
    qa = clean_document_text("Q: 角色是谁\nA: April\nQ: 场景在哪\nA: 车站", profile="qa")
    assert len(qa.chunks) == 2
    table = clean_document_text("name,role\nApril,writer\nBo,artist", file_name="x.csv")
    assert table.chunks[0].content == "- name: April\n- role: writer"
    law = clean_document_text("第一条 总则\n内容\n第二条 定义\n内容", profile="laws")
    assert len(law.chunks) == 2


__all__ = [
    "CleanResult",
    "CleanedChunk",
    "clean_document_text",
    "resolve_profile",
]
