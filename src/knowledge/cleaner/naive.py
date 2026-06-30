from __future__ import annotations

from .common import paragraphs, split_long_text
from .types import CleanedChunk


def clean_naive(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    chunks: list[CleanedChunk] = []
    current: list[str] = []
    current_len = 0

    for paragraph in paragraphs(text):
        parts = split_long_text(paragraph, chunk_size)
        for part in parts:
            if current and current_len + len(part) > chunk_size:
                chunks.append(CleanedChunk("\n\n".join(current), "text"))
                current = []
                current_len = 0
            current.append(part)
            current_len += len(part)

    if current:
        chunks.append(CleanedChunk("\n\n".join(current), "text"))
    return chunks
