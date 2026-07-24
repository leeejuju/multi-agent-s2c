from __future__ import annotations

import re

from .common import is_heading, lines, remove_toc_lines
from .title import clean_by_titles
from .types import CleanedChunk


def clean_paper(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    source_lines = remove_toc_lines(lines(text))
    abstract, rest = extract_abstract(source_lines)
    chunks: list[CleanedChunk] = []
    if abstract:
        chunks.append(
            CleanedChunk(
                "\n".join(abstract),
                "abstract",
                {"important": ["abstract", "摘要", "summary", "总结"]},
            )
        )
    body = "\n".join(rest)
    chunks.extend(clean_by_titles(body, chunk_size=chunk_size) if body else [])
    return chunks


def extract_abstract(source_lines: list[str]) -> tuple[list[str], list[str]]:
    start = -1
    for index, line in enumerate(source_lines[:80]):
        if re.match(r"^(abstract|摘要)\b[:：]?$", line, re.IGNORECASE):
            start = index
            break
    if start < 0:
        return [], source_lines

    end = len(source_lines)
    for index in range(start + 1, min(len(source_lines), start + 80)):
        if re.match(
            r"^(keywords?|关键词|introduction|引言)\b",
            source_lines[index],
            re.IGNORECASE,
        ):
            end = index
            break
        if index > start + 2 and is_heading(source_lines[index]):
            end = index
            break
    return source_lines[start:end], source_lines[:start] + source_lines[end:]
