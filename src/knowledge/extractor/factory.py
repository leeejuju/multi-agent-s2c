from __future__ import annotations

from pathlib import Path
from typing import Any

from .base import ExtractorResult, NoExtractorError


class ExtractorFactory:
    """Registry and resolver for file extractors."""

    def __init__(self, extractors: list[Any] | None = None) -> None:
        self._extractors: list[Any] = []
        self._by_name: dict[str, Any] = {}
        for extractor in extractors or ():
            self.register(extractor)

    @classmethod
    def default(cls) -> ExtractorFactory:
        from .paddle_ocr import PaddleOCRExtractor
        from .rapid_ocr import RapidOCRExtractor

        return cls(
            [
                RapidOCRExtractor(),
                PaddleOCRExtractor(),
            ]
        )

    @property
    def extractors(self) -> tuple[Any, ...]:
        return tuple(self._extractors)

    def register(self, extractor: Any) -> None:
        names = (
            self._extractor_name(extractor),
            *getattr(extractor, "aliases", ()),
        )
        for name in names:
            normalized_name = self._normalize_name(name)
            if normalized_name in self._by_name:
                raise ValueError(f"Extractor already registered: {name}")
            self._by_name[normalized_name] = extractor
        self._extractors.append(extractor)

    def create(self, extractor_type: str) -> Any:
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
    ) -> Any:
        if extractor_type:
            extractor = self.create(extractor_type)
            if not extractor.is_supported(Path(filepath).suffix, content_type=content_type):
                raise NoExtractorError(
                    f"{self._extractor_name(extractor)} does not support "
                    f"file={Path(filepath).name!r}, content_type={content_type!r}."
                )
            return extractor

        for extractor in self._extractors:
            if extractor.is_supported(Path(filepath).suffix, content_type=content_type):
                return extractor

        supported = (
            ", ".join(self._extractor_name(extractor) for extractor in self._extractors)
            or "none"
        )
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

    @staticmethod
    def _extractor_name(extractor: Any) -> str:
        service_name = getattr(extractor, "service_name", None)
        if callable(service_name):
            return str(service_name())
        return type(extractor).__name__.removesuffix("Extractor").lower()
