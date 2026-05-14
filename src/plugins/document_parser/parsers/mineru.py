from __future__ import annotations

from collections.abc import Iterable
from threading import Event

from ..base import BlockingDocumentParser, DocumentParseEvent, DocumentParseRequest
from ..formats import (
    BASIC_FILE_CONTENT_TYPES,
    BASIC_FILE_EXTENSIONS,
    iter_basic_extractable_events,
)


class MineruDocumentParser(BlockingDocumentParser):
    """MinerU adapter skeleton.

    MinerU deployments vary between Python APIs, CLIs, and services. This class
    reserves the parser contract and returns structured events until a concrete
    local integration is configured.
    """

    name = "mineru"
    display_name = "MinerU parser"
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
            message="Starting MinerU adapter.",
        )

        basic_events = iter_basic_extractable_events(
            parser_name=self.name,
            request=request,
            stop_event=stop_event,
        )
        if basic_events is not None:
            yield from basic_events
            return

        try:
            import mineru  # noqa: F401
        except ImportError:
            yield DocumentParseEvent.warning(
                parser=self.name,
                file_name=request.file_name,
                message="mineru is not installed; MinerU parsing is unavailable.",
                metadata={"missing_dependency": "mineru"},
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
                message="MinerU parsing was cancelled before adapter execution.",
            )
            return

        yield DocumentParseEvent.warning(
            parser=self.name,
            file_name=request.file_name,
            message="MinerU is installed, but no concrete MinerU adapter is configured yet.",
            metadata={"engine": "mineru"},
        )
        yield DocumentParseEvent.completed(
            parser=self.name,
            file_name=request.file_name,
            metadata={"success": False},
        )
