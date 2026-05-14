from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator, Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from threading import Event
from typing import Any, Literal

from src.utils import logger

DocumentParseEventType = Literal[
    "started",
    "progress",
    "chunk",
    "page",
    "warning",
    "error",
    "completed",
]


class NoDocumentParserError(ValueError):
    """Raised when no parser can handle a document request."""


@dataclass(slots=True, frozen=True)
class DocumentParseRequest:
    """Input for document parsing.

    Exactly one of `content` or `file_path` is usually enough. Both are allowed
    so callers can pass bytes plus a source path/name for richer metadata.
    """

    file_name: str
    content_type: str | None = None
    content: bytes | None = None
    file_path: str | Path | None = None
    parser_name: str | None = None
    options: Mapping[str, Any] = field(default_factory=dict)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.content is None and self.file_path is None:
            raise ValueError("DocumentParseRequest requires content or file_path.")

        normalized_content_type = (self.content_type or "").lower().strip()
        object.__setattr__(self, "content_type", normalized_content_type)

        if self.file_path is not None and not isinstance(self.file_path, Path):
            object.__setattr__(self, "file_path", Path(self.file_path))

    @property
    def extension(self) -> str:
        return Path(self.file_name).suffix.lower()

    def read_bytes(self) -> bytes:
        if self.content is not None:
            return self.content
        if self.file_path is None:
            raise ValueError("No content or file_path available.")
        return Path(self.file_path).read_bytes()


@dataclass(slots=True, frozen=True)
class DocumentParseEvent:
    """One item from a document parsing event stream."""

    type: DocumentParseEventType
    parser: str
    file_name: str | None = None
    content: str | None = None
    message: str | None = None
    page_number: int | None = None
    progress: float | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    @staticmethod
    def _log_event(
        *,
        event_type: DocumentParseEventType,
        parser: str,
        file_name: str | None,
        message: str | None,
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        metadata = metadata or {}
        log_message = message or ""

        if event_type == "started":
            logger.info(
                "Document parse started: parser=%s, file=%s. %s",
                parser,
                file_name,
                log_message,
            )
            return

        if event_type == "completed":
            success = metadata.get("success")
            if success is False:
                logger.warning(
                    "Document parse completed without success: parser=%s, file=%s. %s",
                    parser,
                    file_name,
                    log_message,
                )
            else:
                logger.info(
                    "Document parse completed: parser=%s, file=%s. %s",
                    parser,
                    file_name,
                    log_message,
                )
            return

        if event_type == "warning":
            logger.warning(
                "Document parse warning: parser=%s, file=%s. %s",
                parser,
                file_name,
                log_message,
            )
            return

        if event_type == "error":
            logger.error(
                "Document parse error: parser=%s, file=%s. %s",
                parser,
                file_name,
                log_message,
            )

    @classmethod
    def started(
        cls,
        *,
        parser: str,
        file_name: str,
        message: str | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        cls._log_event(
            event_type="started",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata,
        )
        return cls(
            type="started",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata or {},
        )

    @classmethod
    def chunk(
        cls,
        *,
        parser: str,
        file_name: str,
        content: str,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        return cls(
            type="chunk",
            parser=parser,
            file_name=file_name,
            content=content,
            metadata=metadata or {},
        )

    @classmethod
    def page(
        cls,
        *,
        parser: str,
        file_name: str,
        page_number: int,
        content: str,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        return cls(
            type="page",
            parser=parser,
            file_name=file_name,
            page_number=page_number,
            content=content,
            metadata=metadata or {},
        )

    @classmethod
    def warning(
        cls,
        *,
        parser: str,
        file_name: str,
        message: str,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        cls._log_event(
            event_type="warning",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata,
        )
        return cls(
            type="warning",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata or {},
        )

    @classmethod
    def error(
        cls,
        *,
        parser: str,
        file_name: str | None,
        message: str,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        cls._log_event(
            event_type="error",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata,
        )
        return cls(
            type="error",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata or {},
        )

    @classmethod
    def completed(
        cls,
        *,
        parser: str,
        file_name: str,
        message: str | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> DocumentParseEvent:
        cls._log_event(
            event_type="completed",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata,
        )
        return cls(
            type="completed",
            parser=parser,
            file_name=file_name,
            message=message,
            metadata=metadata or {},
        )


@dataclass(slots=True, frozen=True)
class DocumentParseResult:
    """Completed parse result for one document.

    This is the unit callers should persist when batch parsing with
    as-completed scheduling.
    """

    request: DocumentParseRequest
    parser: str
    events: tuple[DocumentParseEvent, ...]
    content: str = ""
    success: bool = False
    error: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    @classmethod
    def from_events(
        cls,
        *,
        request: DocumentParseRequest,
        parser: str,
        events: Iterable[DocumentParseEvent],
    ) -> DocumentParseResult:
        collected = tuple(events)
        content = "".join(
            event.content or ""
            for event in collected
            if event.type in {"chunk", "page"}
        )
        error_event = next(
            (event for event in reversed(collected) if event.type == "error"),
            None,
        )
        completed_event = next(
            (event for event in reversed(collected) if event.type == "completed"),
            None,
        )
        success = (
            completed_event is not None
            and completed_event.metadata.get("success") is not False
            and error_event is None
        )
        metadata = dict(completed_event.metadata) if completed_event else {}
        return cls(
            request=request,
            parser=parser,
            events=collected,
            content=content,
            success=success,
            error=error_event.message if error_event else None,
            metadata=metadata,
        )


class BaseDocumentParser(ABC):
    """Async document parser contract."""

    name: str = "base"
    display_name: str = "Base document parser"
    supported_content_types: tuple[str, ...] = ()
    supported_extensions: tuple[str, ...] = ()

    def supports(self, request: DocumentParseRequest) -> bool:
        if request.extension and request.extension in self.supported_extensions:
            return True
        return self._matches_content_type(request.content_type or "")

    @abstractmethod
    async def parse(
        self,
        request: DocumentParseRequest,
    ) -> AsyncGenerator[DocumentParseEvent, None]:
        """Parse a document and yield structured events."""
        yield DocumentParseEvent.error(
            parser=self.name,
            file_name=request.file_name,
            message="Parser has no implementation.",
        )

    def _matches_content_type(self, content_type: str) -> bool:
        if not content_type:
            return False

        for candidate in self.supported_content_types:
            if candidate == content_type:
                return True
            if candidate.endswith("/*"):
                prefix = candidate[:-1]
                if content_type.startswith(prefix):
                    return True

        return False


class BlockingDocumentParser(BaseDocumentParser):
    """Parser base for blocking engines wrapped by an async generator."""

    async def parse(
        self,
        request: DocumentParseRequest,
    ) -> AsyncGenerator[DocumentParseEvent, None]:
        async for event in self.parse_with_executor(request):
            yield event

    async def parse_with_executor(
        self,
        request: DocumentParseRequest,
        executor: Any | None = None,
    ) -> AsyncGenerator[DocumentParseEvent, None]:
        from .runner import run_blocking_event_stream

        async for event in run_blocking_event_stream(
            lambda stop_event: self.parse_blocking(request, stop_event),
            executor=executor,
        ):
            yield event

    @abstractmethod
    def parse_blocking(
        self,
        request: DocumentParseRequest,
        stop_event: Event,
    ) -> Iterable[DocumentParseEvent]:
        """Blocking parse implementation executed inside a thread."""
        raise NotImplementedError
