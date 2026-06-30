from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass, field
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
    """定义处理基类."""

    aliases: tuple[str, ...] = ()

    @abstractmethod
    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        """执行各自的处理逻辑."""

    @abstractmethod
    async def check_status(self, **params: Any) -> dict[str, Any]:
        """Check local model or remote API availability."""

    def service_name(self) -> str:
        return type(self).__name__.removesuffix("Extractor").lower()

    def is_supported(
        self,
        file_suffix: str
    ) -> bool:
        return file_suffix.lower() in self.get_supported_type()

    @abstractmethod
    def get_supported_type(self) -> list[str]:
        """Return supported content types and file suffixes."""
