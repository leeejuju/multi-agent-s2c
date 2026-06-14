from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from rapidocr import RapidOCR

from .base import BaseExtractor, ExtractorResult, NoExtractorError

SUPPORTED_CONTENT_TYPES = (
    "application/pdf",
    "image/*",
)
SUPPORTED_EXTENSIONS = (
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
)
RAPID_OCR_CALL_OPTIONS = (
    "use_det",
    "use_cls",
    "use_rec",
    "return_word_box",
    "return_single_char_box",
    "text_score",
    "box_thresh",
    "unclip_ratio",
)


class RapidOCRExtractor(BaseExtractor):
    def __init__(
        self,
        *,
        config_path: str | Path | None = None,
        engine_params: dict[str, Any] | None = None,
    ) -> None:
        self.config_path = config_path
        self.engine_params = dict(engine_params or {})
        self._engine: Any | None = None

    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        path = Path(filepath)
        if not self.supports_file(path, content_type=params.get("content_type")):
            raise NoExtractorError(
                f"{self.service_name()} does not support file={path.name!r}, "
                f"content_type={params.get('content_type')!r}."
            )

        status = await self.check_status(**params)
        if not status.get("available"):
            return _failure_result(
                self.service_name(),
                path,
                str(status.get("error") or "RapidOCR is unavailable."),
                status,
            )

        try:
            output = await asyncio.to_thread(self._run_rapidocr, path, params)
        except Exception as exc:
            return _failure_result(
                self.service_name(),
                path,
                f"RapidOCR extraction failed: {exc}",
                {
                    "stage": "extract",
                    "engine": "rapidocr",
                    "exception_type": type(exc).__name__,
                },
            )

        lines = _extract_text_lines(output)
        scores = _extract_scores(output)
        return ExtractorResult(
            extractor=self.service_name(),
            file_path=str(path),
            content="\n".join(lines),
            success=True,
            metadata={
                "engine": "rapidocr",
                "line_count": len(lines),
                "scores": scores,
                "average_score": _average_score(scores),
            },
            )

    async def check_status(self, **_: Any) -> dict[str, Any]:
        if self._engine is None:
            self._engine = RapidOCR(
                config_path=str(self.config_path) if self.config_path else None,
                params=self.engine_params or None,
            )
        return {"available": True, "service": self.service_name()}

    def service_name(self) -> str:
        return "rapidocr"

    def supports_file(
        self,
        filepath: str | Path,
        *,
        content_type: str | None = None,
    ) -> bool:
        return _supports_file(filepath, content_type=content_type)

    def supported_file_types(self) -> list[str]:
        return [*SUPPORTED_CONTENT_TYPES, *SUPPORTED_EXTENSIONS]

    def _run_rapidocr(self, filepath: Path, params: dict[str, Any]) -> Any:
        engine = self._get_engine(params)
        call_options = {
            key: params[key]
            for key in RAPID_OCR_CALL_OPTIONS
            if key in params and params[key] is not None
        }
        return engine(str(filepath), **call_options)

    def _get_engine(self, params: dict[str, Any]) -> Any:
        config_path = params.get("rapidocr_config_path") or params.get("config_path")
        engine_params = params.get("rapidocr_params") or params.get("params")
        has_call_config = config_path is not None or engine_params is not None
        if has_call_config:
            return RapidOCR(
                config_path=str(config_path) if config_path else None,
                params=engine_params if isinstance(engine_params, dict) else None,
            )

        if self._engine is None:
            self._engine = RapidOCR(
                config_path=str(self.config_path) if self.config_path else None,
                params=self.engine_params or None,
            )
        return self._engine


def _supports_file(filepath: str | Path, *, content_type: str | None = None) -> bool:
    extension = Path(filepath).suffix.lower()
    if extension and extension in SUPPORTED_EXTENSIONS:
        return True

    normalized_content_type = (content_type or "").lower().strip()
    for candidate in SUPPORTED_CONTENT_TYPES:
        if candidate == normalized_content_type:
            return True
        if candidate.endswith("/*") and normalized_content_type.startswith(candidate[:-1]):
            return True
    return False


def _failure_result(
    service_name: str,
    filepath: str | Path,
    error: str,
    metadata: dict[str, Any],
) -> ExtractorResult:
    return ExtractorResult(
        extractor=service_name,
        file_path=str(filepath),
        success=False,
        error=error,
        metadata=metadata,
    )


def _extract_text_lines(output: Any) -> list[str]:
    texts = getattr(output, "txts", None)
    if texts is None and isinstance(output, dict):
        texts = output.get("txts") or output.get("texts")
    if texts is None:
        return []
    return [str(text).strip() for text in texts if str(text).strip()]


def _extract_scores(output: Any) -> list[float]:
    scores = getattr(output, "scores", None)
    if scores is None and isinstance(output, dict):
        scores = output.get("scores")
    if scores is None:
        return []

    normalized_scores: list[float] = []
    for score in scores:
        try:
            normalized_scores.append(float(score))
        except (TypeError, ValueError):
            continue
    return normalized_scores


def _average_score(scores: list[float]) -> float | None:
    if not scores:
        return None
    return sum(scores) / len(scores)
