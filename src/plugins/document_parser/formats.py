from __future__ import annotations

from collections.abc import Iterable
from io import BytesIO
from pathlib import Path
from threading import Event
from zipfile import BadZipFile, ZipFile
import xml.etree.ElementTree as ET

from .base import DocumentParseEvent, DocumentParseRequest

DOCX_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

TEXT_CONTENT_TYPES = ("text/*", "application/json")
TEXT_EXTENSIONS = (".txt", ".md", ".markdown", ".json", ".csv", ".log")

BASIC_DOCUMENT_CONTENT_TYPES = (
    *TEXT_CONTENT_TYPES,
    "application/pdf",
    DOCX_CONTENT_TYPE,
)
BASIC_DOCUMENT_EXTENSIONS = (
    *TEXT_EXTENSIONS,
    ".pdf",
    ".docx",
)

IMAGE_CONTENT_TYPES = ("image/*",)
IMAGE_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
    ".svg",
)

BASIC_FILE_CONTENT_TYPES = (*BASIC_DOCUMENT_CONTENT_TYPES, *IMAGE_CONTENT_TYPES)
BASIC_FILE_EXTENSIONS = (*BASIC_DOCUMENT_EXTENSIONS, *IMAGE_EXTENSIONS)


def is_text_document(request: DocumentParseRequest) -> bool:
    if request.extension in TEXT_EXTENSIONS:
        return True
    content_type = request.content_type or ""
    return content_type.startswith("text/") or content_type == "application/json"


def is_docx_document(request: DocumentParseRequest) -> bool:
    return request.extension == ".docx" or request.content_type == DOCX_CONTENT_TYPE


def iter_basic_extractable_events(
    *,
    parser_name: str,
    request: DocumentParseRequest,
    stop_event: Event,
) -> Iterable[DocumentParseEvent] | None:
    if is_text_document(request):
        return _iter_text_events(
            parser_name=parser_name,
            request=request,
            stop_event=stop_event,
        )
    if is_docx_document(request):
        return _iter_docx_events(
            parser_name=parser_name,
            request=request,
            stop_event=stop_event,
        )
    return None


def _iter_text_events(
    *,
    parser_name: str,
    request: DocumentParseRequest,
    stop_event: Event,
) -> Iterable[DocumentParseEvent]:
    encoding = str(request.options.get("encoding") or "utf-8")
    chunk_size = max(int(request.options.get("chunk_size") or 4000), 1)

    data = request.read_bytes()
    try:
        text = data.decode(encoding)
    except UnicodeDecodeError:
        text = data.decode("utf-8", errors="replace")
        yield DocumentParseEvent.warning(
            parser=parser_name,
            file_name=request.file_name,
            message="Failed to decode with requested encoding; used replacement decoding.",
            metadata={"encoding": encoding},
        )

    chunk_count = 0
    for offset in range(0, len(text), chunk_size):
        if stop_event.is_set():
            yield DocumentParseEvent.warning(
                parser=parser_name,
                file_name=request.file_name,
                message="Basic text parsing was cancelled.",
            )
            break
        chunk_count += 1
        yield DocumentParseEvent.chunk(
            parser=parser_name,
            file_name=request.file_name,
            content=text[offset : offset + chunk_size],
            metadata={
                "chunk_index": chunk_count,
                "offset": offset,
                "basic_format": True,
            },
        )

    yield DocumentParseEvent.completed(
        parser=parser_name,
        file_name=request.file_name,
        message="Basic text parsing completed.",
        metadata={"chunk_count": chunk_count, "success": True, "basic_format": True},
    )


def _iter_docx_events(
    *,
    parser_name: str,
    request: DocumentParseRequest,
    stop_event: Event,
) -> Iterable[DocumentParseEvent]:
    try:
        text = _extract_docx_text(request)
    except (BadZipFile, KeyError, ET.ParseError, OSError) as exc:
        yield DocumentParseEvent.error(
            parser=parser_name,
            file_name=request.file_name,
            message=f"Failed to extract basic DOCX text: {exc}",
            metadata={"exception_type": type(exc).__name__, "basic_format": True},
        )
        return

    if stop_event.is_set():
        yield DocumentParseEvent.warning(
            parser=parser_name,
            file_name=request.file_name,
            message="Basic DOCX parsing was cancelled.",
        )
        return

    yield DocumentParseEvent.chunk(
        parser=parser_name,
        file_name=request.file_name,
        content=text,
        metadata={"basic_format": True},
    )
    yield DocumentParseEvent.completed(
        parser=parser_name,
        file_name=request.file_name,
        message="Basic DOCX parsing completed.",
        metadata={"success": True, "basic_format": True},
    )


def _extract_docx_text(request: DocumentParseRequest) -> str:
    if request.file_path is not None:
        archive_source = Path(request.file_path)
    else:
        archive_source = BytesIO(request.read_bytes())

    with ZipFile(archive_source) as archive:
        xml_bytes = archive.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    paragraph_tag = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"
    text_tag = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"

    paragraphs: list[str] = []
    for paragraph in root.iter(paragraph_tag):
        parts = [node.text for node in paragraph.iter(text_tag) if node.text]
        if parts:
            paragraphs.append("".join(parts))

    return "\n".join(paragraphs)

