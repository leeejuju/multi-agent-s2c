"""Plugin-style document parsing primitives.

This package is intentionally standalone. It exposes parser factories and
async event streams, but it does not mutate chat, database, or storage flows.
"""

from .base import (
    BaseDocumentParser,
    BlockingDocumentParser,
    DocumentParseEvent,
    DocumentParseRequest,
    DocumentParseResult,
    NoDocumentParserError,
)
from .factory import DocumentParserFactory
from .runner import (
    DocumentParseExecutor,
    DocumentParserRunner,
    ResultWriter,
    run_blocking_event_stream,
)

__all__ = [
    "BaseDocumentParser",
    "BlockingDocumentParser",
    "DocumentParseEvent",
    "DocumentParseExecutor",
    "DocumentParseRequest",
    "DocumentParseResult",
    "DocumentParserFactory",
    "DocumentParserRunner",
    "NoDocumentParserError",
    "ResultWriter",
    "run_blocking_event_stream",
]
