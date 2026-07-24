from __future__ import annotations

from pathlib import Path

from .registry import resolve_parser


def get_parser(
    *,
    filename: str | Path | None = None,
    content_type: str | None = None,
    parser_type: str | None = None,
) -> object:
    return resolve_parser(
        filename=filename,
        content_type=content_type,
        parser_type=parser_type,
    )()
