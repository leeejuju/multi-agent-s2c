from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from .base import ExtractorResult, NoExtractorError

SUPPORTED_CONTENT_TYPES = (
    "application/pdf",
    "application/msword",
    "application/vnd.ms-powerpoint",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "application/xhtml+xml",
)
SUPPORTED_EXTENSIONS = (
    ".docx",
    ".doc",
    ".html",
    ".htm",
    ".ppt",
    ".xls",
    ".xlsx",
    ".pdf",
    ".pptx",
)


class DoclingExtractor:
    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        path = Path(filepath)
        if not self.supports_file(path, content_type=params.get("content_type")):
            raise NoExtractorError(
                f"docling does not support file={path.name!r}, "
                f"content_type={params.get('content_type')!r}."
            )

        try:
            content = await asyncio.to_thread(_convert_to_markdown, path)
        except Exception as exc:
            return ExtractorResult(
                extractor="docling",
                file_path=str(path),
                success=False,
                error=f"Docling extraction failed: {exc}",
                metadata={
                    "stage": "extract",
                    "engine": "docling",
                    "exception_type": type(exc).__name__,
                },
            )

        return ExtractorResult(
            extractor="docling",
            file_path=str(path),
            content=content,
            success=True,
            metadata={"engine": "docling"},
        )

    def supports_file(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> bool:
        extension = Path(filepath).suffix.lower()
        if extension and extension in SUPPORTED_EXTENSIONS:
            return True

        normalized_content_type = (content_type or "").lower().strip()
        for candidate in SUPPORTED_CONTENT_TYPES:
            if candidate == normalized_content_type:
                return True
            if candidate.endswith("/*") and normalized_content_type.startswith(
                candidate[:-1]
            ):
                return True
        return False


def _convert_to_markdown(filepath: Path) -> str:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(str(filepath))
    document = getattr(result, "document", result)
    export = getattr(document, "export_to_markdown", None)
    return export() if callable(export) else str(document)
