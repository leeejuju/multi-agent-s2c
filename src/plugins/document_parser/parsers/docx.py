from __future__ import annotations

from collections.abc import Iterable
from threading import Event

from ..base import BlockingDocumentParser, DocumentParseEvent, DocumentParseRequest
from ..formats import (
    BASIC_DOCUMENT_CONTENT_TYPES,
    BASIC_DOCUMENT_EXTENSIONS,
    iter_basic_extractable_events,
)


class DocxDocumentParser(BlockingDocumentParser):
    """Basic document parser for text-like files and DOCX containers."""

    name = "docx"
    display_name = "DOCX text parser"
    supported_content_types = BASIC_DOCUMENT_CONTENT_TYPES
    supported_extensions = BASIC_DOCUMENT_EXTENSIONS

    def parse_blocking(
        self,
        request: DocumentParseRequest,
        stop_event: Event,
    ) -> Iterable[DocumentParseEvent]:
        yield DocumentParseEvent.started(
            parser=self.name,
            file_name=request.file_name,
            message="Reading DOCX document.",
        )

        basic_events = iter_basic_extractable_events(
            parser_name=self.name,
            request=request,
            stop_event=stop_event,
        )
        if basic_events is not None:
            yield from basic_events
            return

        yield DocumentParseEvent.warning(
            parser=self.name,
            file_name=request.file_name,
            message="DOCX parser only handles basic text and DOCX formats.",
        )
        yield DocumentParseEvent.completed(
            parser=self.name,
            file_name=request.file_name,
            metadata={"success": False},
        )
