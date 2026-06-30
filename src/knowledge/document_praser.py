from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

from markdownify import markdownify

from src.knowledge.extractor import ExtractorFactory, ExtractorResult, NoExtractorError
from src.storage import get_storage
from src.utils import logger

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
}
READ_EXTENSIONS = {".txt", ".md", ".markdown", ".html", ".htm", ".csv", ".json"}
DOC2IMG_EXTENSIONS = {".docx", ".ppt", ".pptx", ".xls", ".xlsx"}
DOC_EXTENSIONS = {".doc"}

READ_CONTENT_TYPES = {
    "application/csv",
    "application/json",
    "application/xhtml+xml",
    "text/csv",
    "text/html",
    "text/markdown",
    "text/plain",
}
PDF_CONTENT_TYPES = {"application/pdf"}

PDF_OCR_EXTRACTORS = ("paddleocr", "rapidocr")
IMAGE_OCR_EXTRACTORS = ("rapidocr", "paddleocr")


@dataclass(slots=True)
class DocumentParseResult:
    success: bool
    markdown: str = ""
    parser: str = "document_processor"
    source_path: str = ""
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)



async def parser_file_to_markdown(
    file_path: str | Path,
    *,
    content_type: str | None = None,
    file_name: str | None = None,
    file_key: str | None = None,
    enable_ocr: bool = False,
    parser_type: str | None = None,
    extractor_factory: ExtractorFactory | None = None,
    **params: Any,
) -> DocumentParseResult:
    logger.info(
        "Document parsing started: file_path=%s, file_name=%s, content_type=%s, "
        "file_key=%s, enable_ocr=%s, parser_type=%s.",
        file_path,
        file_name,
        content_type,
        file_key,
        enable_ocr,
        parser_type,
    )
    try:
        async with _source_to_local_file(
            file_path,
            file_name=file_name,
            file_key=file_key,
        ) as local_path:
            result = await _parser_file_to_markdown(
                local_path,
                content_type=content_type,
                file_name=file_name,
                enable_ocr=enable_ocr,
                parser_type=parser_type,
                extractor_factory=extractor_factory,
                **params,
            )
            logger.info(
                "Document parsing completed: success=%s, parser=%s, source_path=%s, "
                "error=%s.",
                result.success,
                result.parser,
                result.source_path,
                result.error,
            )
            return result
    except Exception as exc:
        logger.exception(
            "Document parsing failed: file_path=%s, file_name=%s, content_type=%s, "
            "file_key=%s.",
            file_path,
            file_name,
            content_type,
            file_key,
        )
        return DocumentParseResult(
            success=False,
            source_path=str(file_path),
            error=str(exc),
            metadata={"exception_type": type(exc).__name__},
        )


async def _parser_file_to_markdown(
    file_path: str | Path,
    *,
    content_type: str | None,
    file_name: str | None,
    enable_ocr: bool,
    parser_type: str | None,
    extractor_factory: ExtractorFactory | None,
    **params: Any,
) -> DocumentParseResult:
    path = Path(file_path)
    extension = _extension(path, file_name=file_name)
    normalized_content_type = (content_type or "").lower().strip()
    logger.debug(
        "Document parser dispatch: path=%s, extension=%s, content_type=%s.",
        path,
        extension,
        normalized_content_type,
    )

    if extension in PDF_EXTENSIONS or normalized_content_type in PDF_CONTENT_TYPES:
        return await _parse_pdf_async(
            path,
            content_type=content_type,
            file_name=file_name,
            enable_ocr=enable_ocr,
            parser_type=parser_type,
            extractor_factory=extractor_factory,
            **params,
        )

    if extension in IMAGE_EXTENSIONS or normalized_content_type.startswith("image/"):
        return await _parse_image_async(
            path,
            content_type=content_type,
            file_name=file_name,
            parser_type=parser_type,
            extractor_factory=extractor_factory,
            **params,
        )

    if extension in READ_EXTENSIONS or normalized_content_type in READ_CONTENT_TYPES:
        content = await asyncio.to_thread(
            path.read_text,
            encoding="utf-8",
            errors="replace",
        )
        return DocumentParseResult(
            success=True,
            markdown=_to_markdown(content, source_type=extension.lstrip(".")),
            parser="read",
            source_path=str(path),
            metadata={
                "source_file_name": file_name or path.name,
                "content_type": normalized_content_type or None,
            },
        )

    if extension in DOC2IMG_EXTENSIONS or extension in DOC_EXTENSIONS:
        content = await asyncio.to_thread(_convert_with_docling, path)
        return DocumentParseResult(
            success=True,
            markdown=_to_markdown(content, source_type=extension.lstrip(".")),
            parser="docling",
            source_path=str(path),
            metadata={
                "content_type": normalized_content_type or None,
                "source_file_name": file_name or path.name,
            },
        )

    raise NoExtractorError(
        f"No document processor supports file={path.name!r}, "
        f"content_type={content_type!r}."
    )


async def _parse_pdf_async(
    file_path: str | Path,
    *,
    content_type: str | None = None,
    file_name: str | None = None,
    enable_ocr: bool = False,
    parser_type: str | None = None,
    extractor_factory: ExtractorFactory | None = None,
    **params: Any,
) -> DocumentParseResult:
    path = Path(file_path)
    if enable_ocr:
        return await _parse_with_extractors(
            path,
            PDF_OCR_EXTRACTORS,
            content_type=content_type,
            file_name=file_name,
            parser_type=parser_type,
            extractor_factory=extractor_factory,
            **params,
        )

    return await asyncio.to_thread(
        _parse_pdf_with_loader,
        path,
        content_type=content_type,
        file_name=file_name,
    )


async def _parse_image_async(
    file_path: str | Path,
    *,
    content_type: str | None = None,
    file_name: str | None = None,
    parser_type: str | None = None,
    extractor_factory: ExtractorFactory | None = None,
    **params: Any,
) -> DocumentParseResult:
    return await _parse_with_extractors(
        Path(file_path),
        IMAGE_OCR_EXTRACTORS,
        content_type=content_type,
        file_name=file_name,
        parser_type=parser_type,
        extractor_factory=extractor_factory,
        **params,
    )


def _to_markdown(content: str, *, source_type: str | None = None) -> str:
    return markdownify(content, heading_style="ATX").strip()


def _convert_with_docling(file_path: Path) -> str:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(str(file_path))
    document = getattr(result, "document", result)
    export = getattr(document, "export_to_markdown", None)
    return export() if callable(export) else str(document)


async def _parse_with_extractors(
    file_path: Path,
    parser_types: tuple[str, ...],
    *,
    content_type: str | None,
    file_name: str | None,
    parser_type: str | None,
    extractor_factory: ExtractorFactory | None,
    **params: Any,
) -> DocumentParseResult:
    factory = extractor_factory or ExtractorFactory.default()
    candidates = (parser_type,) if parser_type else parser_types
    failures: list[dict[str, Any]] = []

    for candidate in candidates:
        if not candidate:
            continue

        try:
            extractor = factory.create(candidate)
            parser_name = _extractor_name(extractor)
            if not extractor.is_supported(file_path.suffix, content_type=content_type):
                failures.append(
                    {
                        "parser": parser_name,
                        "success": False,
                        "error": "unsupported_file_type",
                    }
                )
                continue

            result = await extractor.extractor_file(
                file_path,
                content_type=content_type,
                file_name=file_name,
                **params,
            )
        except Exception as exc:
            failures.append(
                {
                    "parser": candidate,
                    "success": False,
                    "error": str(exc),
                    "exception_type": type(exc).__name__,
                }
            )
            continue

        if result.success:
            return _from_extractor_result(result, source_type=file_path.suffix)

        failures.append(
            {
                "parser": result.extractor or candidate,
                "success": False,
                "error": result.error,
                "metadata": dict(result.metadata),
            }
        )

    return DocumentParseResult(
        success=False,
        parser="document_processor",
        source_path=str(file_path),
        error="No document parser succeeded.",
        metadata={
            "parser_failures": failures,
            "candidate_parsers": list(candidates),
        },
    )


def _parse_pdf_with_loader(
    file_path: Path,
    *,
    content_type: str | None,
    file_name: str | None,
) -> DocumentParseResult:
    from langchain_community.document_loaders import PyPDFLoader

    documents = PyPDFLoader(str(file_path)).load()
    pages = [
        document.page_content.strip()
        for document in documents
        if document.page_content and document.page_content.strip()
    ]
    return DocumentParseResult(
        success=True,
        markdown="\n\n---\n\n".join(pages),
        parser="pypdfloader",
        source_path=str(file_path),
        metadata={
            "content_type": content_type,
            "ocr_enabled": False,
            "page_count": len(documents),
            "source_file_name": file_name or file_path.name,
        },
    )


def _from_extractor_result(
    result: ExtractorResult,
    *,
    source_type: str | None,
) -> DocumentParseResult:
    return DocumentParseResult(
        success=result.success,
        markdown=_to_markdown(result.content or "", source_type=source_type)
        if result.success
        else "",
        parser=result.extractor,
        source_path=result.file_path,
        error=result.error,
        metadata=dict(result.metadata),
    )


@asynccontextmanager
async def _source_to_local_file(
    file_path: str | Path,
    *,
    file_name: str | None,
    file_key: str | None,
) -> AsyncIterator[Path]:
    """将远程文件下载成本地临时文件，或直接返回本地文件路径。"""
    temp_path: Path | None = None
    try:
        source_text = str(file_path)
        if file_key:
            source_path = (file_name or file_key).split("?", 1)[0].split("#", 1)[0]
            suffix = Path(source_path).suffix.lower() or ".bin"
            with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_path = Path(temp_file.name)
            logger.info(
                "Downloading MinIO file for document parsing: file_key=%s, "
                "temp_path=%s.",
                file_key,
                temp_path,
            )
            await get_storage().download_file_to_path(
                "knowledgebases",
                file_key,
                str(temp_path),
            )
            yield temp_path
            return

        if source_text.lower().startswith(("http://", "https://")):
            raise ValueError("不支持当前文件类型。")

        logger.debug("Using local document path for parsing: path=%s.", file_path)
        yield Path(file_path)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def _extension(file_path: Path, *, file_name: str | None) -> str:
    return (Path(file_name or file_path.name).suffix or file_path.suffix).lower()


def _extractor_name(extractor: Any) -> str:
    service_name = getattr(extractor, "service_name", None)
    if callable(service_name):
        return str(service_name())
    return type(extractor).__name__.removesuffix("Extractor").lower()
