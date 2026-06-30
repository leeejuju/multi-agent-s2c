from __future__ import annotations

from .common import (
    LAW_HEADING_RE,
    heading_text,
    is_heading,
    lines,
    make_title_chunks,
    remove_toc_lines,
)
from .types import CleanedChunk


def clean_laws(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    source_lines = remove_toc_lines(lines(text))
    chunks: list[CleanedChunk] = []
    current: list[str] = []
    title = ""

    for line in source_lines:
        if LAW_HEADING_RE.match(line) and current:
            chunks.extend(make_title_chunks(current, title, chunk_size, kind="law"))
            current = []
        if LAW_HEADING_RE.match(line) or is_heading(line):
            title = heading_text(line)
        current.append(line)

    if current:
        chunks.extend(make_title_chunks(current, title, chunk_size, kind="law"))
    return chunks
