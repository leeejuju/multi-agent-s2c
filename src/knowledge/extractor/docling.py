from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from .base import BaseExtractor, ExtractorResult

SUPPORTED_CONTENT_TYPES = (
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "application/xhtml+xml",
)
SUPPORTED_EXTENSIONS = (
    ".docx",
    ".html",
    ".htm",
    ".xls",
    ".xlsx",
    ".pdf",
    ".pptx",
)


class DoclingExtractor(BaseExtractor):
    name = "docling"
    display_name = "Docling extractor"
    supported_content_types = SUPPORTED_CONTENT_TYPES
    supported_extensions = SUPPORTED_EXTENSIONS

    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        path = self.ensure_supported(
            filepath,
            content_type=params.get("content_type"),
        )
        try:
            content = await asyncio.to_thread(_convert_to_markdown, path)
        except ImportError as exc:
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error="docling or one of its dependencies is not installed.",
                metadata={
                    "missing_dependency": "docling",
                    "exception_type": type(exc).__name__,
                },
            )
        except Exception as exc:
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error=f"Docling extraction failed: {exc}",
                metadata={"engine": "docling", "exception_type": type(exc).__name__},
            )

        return ExtractorResult(
            extractor=self.name,
            file_path=str(path),
            content=content,
            success=True,
            metadata={"engine": "docling"},
        )


def _convert_to_markdown(filepath: Path) -> str:
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(str(filepath))
    document = getattr(result, "document", result)
    export = getattr(document, "export_to_markdown", None)
    return export() if callable(export) else str(document)
