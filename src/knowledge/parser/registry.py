from __future__ import annotations

from pathlib import Path

from .doc_parser import DocParser
from .docx_parser import DocxParser
from .html_parser import HtmlParser
from .image_parser import ImageParser
from .markdown_parser import MarkdownParser
from .pdf_parser import PdfParser
from .pptx_parser import PptxParser
from .table_parser import TableParser
from .text_parser import TextParser

PARSER_REGISTRY: dict[str, type] = {
    "pdf": PdfParser,
    "docx": DocxParser,
    "doc": DocParser,
    "md": MarkdownParser,
    "txt": TextParser,
    "csv": TableParser,
    "xlsx": TableParser,
    "pptx": PptxParser,
    "image": ImageParser,
    "html": HtmlParser,
}

_ALIASES = {
    "markdown": "md",
    "text": "txt",
    "excel": "xlsx",
}
_EXTENSIONS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc",
    ".md": "md",
    ".markdown": "md",
    ".txt": "txt",
    ".csv": "csv",
    ".xlsx": "xlsx",
    ".pptx": "pptx",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".bmp": "image",
    ".gif": "image",
    ".tif": "image",
    ".tiff": "image",
    ".html": "html",
    ".htm": "html",
}
_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/markdown": "md",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/html": "html",
    "application/xhtml+xml": "html",
}


def resolve_parser(
    *,
    filename: str | Path | None = None,
    content_type: str | None = None,
    parser_type: str | None = None,
) -> type:
    explicit = _normalize_type(parser_type) if parser_type else None
    by_extension = _EXTENSIONS.get(Path(filename).suffix.lower()) if filename else None
    by_content_type = _type_from_content_type(content_type)

    if explicit:
        inferred = by_extension or by_content_type
        if inferred and inferred != explicit:
            raise ValueError(
                f"Parser {explicit!r} does not match inferred type {inferred!r}."
            )
        return PARSER_REGISTRY[explicit]

    resolved = by_extension or by_content_type
    if resolved is None:
        raise ValueError(
            "Cannot resolve parser without a supported filename, MIME type, "
            "or explicit parser_type."
        )
    return PARSER_REGISTRY[resolved]


def _normalize_type(parser_type: str) -> str:
    normalized = parser_type.strip().lower()
    normalized = _ALIASES.get(normalized, normalized)
    if normalized not in PARSER_REGISTRY:
        raise ValueError(f"Unsupported parser type: {parser_type}.")
    return normalized


def _type_from_content_type(content_type: str | None) -> str | None:
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized.startswith("image/"):
        return "image"
    return _CONTENT_TYPES.get(normalized)
