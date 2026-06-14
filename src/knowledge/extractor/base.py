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
    """Base 基类，定义extractor的行为."""

    @abstractmethod
    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        """从路径提取内容，具体各个子类自行处理."""

    @abstractmethod
    async def check_status(self, **params: Any) -> dict[str, Any]:
        """走 API 时检查服务状态."""

    @abstractmethod
    def service_name(self) -> str:
         """返回提取器服务名称."""

    @abstractmethod
    def supports_file(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> bool:
        """检查提取器是否支持指定的文件."""

    @abstractmethod
    def supported_file_types(self) -> list[str]:
        """返回支持的文件类型列表."""
