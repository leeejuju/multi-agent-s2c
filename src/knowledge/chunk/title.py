from __future__ import annotations

from .common import (
    heading_text,
    is_heading,
    lines,
    make_colon_titles,
    make_title_chunks,
    remove_toc_lines,
)
from .types import CleanedChunk


def clean_by_titles(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    source_lines = make_colon_titles(remove_toc_lines(lines(text)))
    chunks: list[CleanedChunk] = []
    current: list[str] = []
    title = ""

    for line in source_lines:
        if is_heading(line) and current:
            chunks.extend(make_title_chunks(current, title, chunk_size))
            current = []
        if is_heading(line):
            title = heading_text(line)
        current.append(line)

    if current:
        chunks.extend(make_title_chunks(current, title, chunk_size))
    return chunks
