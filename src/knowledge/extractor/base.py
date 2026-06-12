from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass, field
from mimetypes import guess_type
from pathlib import Path
from typing import Any


class NoExtractorError(ValueError):
    """Raised when no extractor can handle a file."""


@dataclass(slots=True, frozen=True)
class ExtractorResult:
    extractor: str
    file_path: str
    content: str = ""
    success: bool = True
    error: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)


class BaseExtractor(ABC):
    name: str = "base"
    display_name: str = "Base extractor"
    aliases: tuple[str, ...] = ()
    supported_content_types: tuple[str, ...] = ()
    supported_extensions: tuple[str, ...] = ()

    def supports_file(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> bool:
        path = Path(filepath)
        extension = path.suffix.lower()
        if extension and extension in self.supported_extensions:
            return True
        return self._matches_content_type((content_type or "").lower().strip())

    def ensure_supported(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> Path:
        path = Path(filepath)
        if not self.supports_file(path, content_type=content_type):
            raise NoExtractorError(
                f"{self.name} does not support file={path.name!r}, "
                f"content_type={content_type!r}."
            )
        return path

    def resolve_content_type(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> str:
        resolved = (content_type or "").lower().strip()
        if resolved:
            return resolved
        guessed, _ = guess_type(str(filepath))
        return guessed or "application/octet-stream"

    @abstractmethod
    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        """Extract text-like content from a local file path."""

    def _matches_content_type(self, content_type: str) -> bool:
        if not content_type:
            return False

        for candidate in self.supported_content_types:
            if candidate == content_type:
                return True
            if candidate.endswith("/*") and content_type.startswith(candidate[:-1]):
                return True
        return False
