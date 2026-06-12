from __future__ import annotations

from pathlib import Path
from typing import Any

from .base import BaseExtractor, ExtractorResult, NoExtractorError


class ExtractorFactory:
    """Registry and resolver for file extractors."""

    def __init__(self, extractors: list[BaseExtractor] | None = None) -> None:
        self._extractors: list[BaseExtractor] = []
        self._by_name: dict[str, BaseExtractor] = {}
        for extractor in extractors or ():
            self.register(extractor)

    @classmethod
    def default(cls) -> ExtractorFactory:
        from .docling import DoclingExtractor
        from .mineru import MinerUExtractor
        from .paddle_ocr import PaddleOCRExtractor

        return cls(
            [
                PaddleOCRExtractor(),
                DoclingExtractor(),
                MinerUExtractor(),
            ]
        )

    @property
    def extractors(self) -> tuple[BaseExtractor, ...]:
        return tuple(self._extractors)

    def register(self, extractor: BaseExtractor) -> None:
        names = (extractor.name, *extractor.aliases)
        for name in names:
            normalized_name = self._normalize_name(name)
            if normalized_name in self._by_name:
                raise ValueError(f"Extractor already registered: {name}")
            self._by_name[normalized_name] = extractor
        self._extractors.append(extractor)

    def create(self, extractor_type: str) -> BaseExtractor:
        normalized_type = self._normalize_name(extractor_type)
        extractor = self._by_name.get(normalized_type)
        if extractor is None:
            supported = ", ".join(sorted(self._by_name)) or "none"
            raise NoExtractorError(
                f"Unsupported extractor type: {extractor_type}. "
                f"Supported extractors: {supported}."
            )
        return extractor

    def resolve(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
        extractor_type: str | None = None,
    ) -> BaseExtractor:
        if extractor_type:
            extractor = self.create(extractor_type)
            extractor.ensure_supported(filepath, content_type=content_type)
            return extractor

        for extractor in self._extractors:
            if extractor.supports_file(filepath, content_type=content_type):
                return extractor

        supported = ", ".join(extractor.name for extractor in self._extractors) or "none"
        raise NoExtractorError(
            f"No extractor supports file={Path(filepath).name!r}, "
            f"content_type={content_type!r}. Registered extractors: {supported}."
        )

    async def extractor_file(
        self,
        filepath: str | Path,
        *,
        extractor_type: str | None = None,
        content_type: str | None = None,
        **params: Any,
    ) -> ExtractorResult:
        extractor = self.resolve(
            filepath,
            content_type=content_type,
            extractor_type=extractor_type,
        )
        return await extractor.extractor_file(
            filepath,
            content_type=content_type,
            **params,
        )

    @staticmethod
    def _normalize_name(name: str) -> str:
        normalized_name = name.strip().lower().replace("-", "_")
        if not normalized_name:
            raise ValueError("Extractor name cannot be empty.")
        return normalized_name
