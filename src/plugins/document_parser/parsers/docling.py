from __future__ import annotations

from collections.abc import Iterable
from tempfile import NamedTemporaryFile
from threading import Event

from ..base import BlockingDocumentParser, DocumentParseEvent, DocumentParseRequest
from ..formats import (
    BASIC_FILE_CONTENT_TYPES,
    BASIC_FILE_EXTENSIONS,
    is_text_document,
    iter_basic_extractable_events,
)


class DoclingDocumentParser(BlockingDocumentParser):
    """Docling adapter skeleton with lazy optional dependency loading."""

    name = "docling"
    display_name = "Docling parser"
    supported_content_types = BASIC_FILE_CONTENT_TYPES
    supported_extensions = BASIC_FILE_EXTENSIONS

    def parse_blocking(
        self,
        request: DocumentParseRequest,
        stop_event: Event,
    ) -> Iterable[DocumentParseEvent]:
        yield DocumentParseEvent.started(
            parser=self.name,
            file_name=request.file_name,
            message="Starting Docling adapter.",
        )

        if is_text_document(request):
            basic_events = iter_basic_extractable_events(
                parser_name=self.name,
                request=request,
                stop_event=stop_event,
            )
            if basic_events is not None:
                yield from basic_events
                return

        try:
            from docling.document_converter import DocumentConverter
        except ImportError as exc:
            yield DocumentParseEvent.warning(
                parser=self.name,
                file_name=request.file_name,
                message="docling or one of its dependencies is not installed; Docling parsing is unavailable.",
                metadata={
                    "missing_dependency": "docling",
                    "exception_type": type(exc).__name__,
                },
            )
            yield DocumentParseEvent.completed(
                parser=self.name,
                file_name=request.file_name,
                metadata={"success": False},
            )
            return

        if stop_event.is_set():
            yield DocumentParseEvent.warning(
                parser=self.name,
                file_name=request.file_name,
                message="Docling parsing was cancelled before conversion.",
            )
            return

        source_path = request.file_path
        temp_file_name: str | None = None
        if source_path is None:
            suffix = request.extension or ".bin"
            with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(request.read_bytes())
                temp_file_name = temp_file.name
            source_path = temp_file_name

        try:
            converter = DocumentConverter()
            result = converter.convert(str(source_path))
            document = getattr(result, "document", result)
            export = getattr(document, "export_to_markdown", None)
            content = export() if callable(export) else str(document)
            yield DocumentParseEvent.chunk(
                parser=self.name,
                file_name=request.file_name,
                content=content,
                metadata={"engine": "docling"},
            )
            yield DocumentParseEvent.completed(
                parser=self.name,
                file_name=request.file_name,
                message="Docling parsing completed.",
                metadata={"success": True},
            )
        finally:
            if temp_file_name:
                from pathlib import Path

                Path(temp_file_name).unlink(missing_ok=True)
