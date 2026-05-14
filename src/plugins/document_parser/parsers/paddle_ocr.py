from __future__ import annotations

from collections.abc import Iterable
from tempfile import NamedTemporaryFile
from threading import Event

from ..base import BlockingDocumentParser, DocumentParseEvent, DocumentParseRequest
from ..formats import (
    BASIC_FILE_CONTENT_TYPES,
    BASIC_FILE_EXTENSIONS,
    iter_basic_extractable_events,
)


class PaddleOcrDocumentParser(BlockingDocumentParser):
    """PaddleOCR image/PDF OCR adapter with lazy optional dependency loading."""

    name = "paddle_ocr"
    display_name = "PaddleOCR parser"
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
            message="Starting PaddleOCR adapter.",
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
            from paddleocr import PaddleOCR
        except ImportError:
            yield DocumentParseEvent.warning(
                parser=self.name,
                file_name=request.file_name,
                message="paddleocr is not installed; OCR parsing is unavailable.",
                metadata={"missing_dependency": "paddleocr"},
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
                message="PaddleOCR parsing was cancelled before OCR execution.",
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
            ocr = PaddleOCR(use_angle_cls=True, lang=str(request.options.get("lang", "ch")))
            result = ocr.ocr(str(source_path), cls=True)
            lines = self._extract_text_lines(result)
            yield DocumentParseEvent.chunk(
                parser=self.name,
                file_name=request.file_name,
                content="\n".join(lines),
                metadata={"line_count": len(lines), "engine": "paddleocr"},
            )
            yield DocumentParseEvent.completed(
                parser=self.name,
                file_name=request.file_name,
                message="PaddleOCR parsing completed.",
                metadata={"line_count": len(lines), "success": True},
            )
        finally:
            if temp_file_name:
                from pathlib import Path

                Path(temp_file_name).unlink(missing_ok=True)

    def _extract_text_lines(self, result: object) -> list[str]:
        lines: list[str] = []
        if not isinstance(result, list):
            return lines

        for page in result:
            if not isinstance(page, list):
                continue
            for item in page:
                if (
                    isinstance(item, list)
                    and len(item) >= 2
                    and isinstance(item[1], tuple)
                    and item[1]
                ):
                    text = item[1][0]
                    if isinstance(text, str):
                        lines.append(text)
        return lines
