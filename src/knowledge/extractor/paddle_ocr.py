from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import httpx

from src.configs.config import config

from .base import BaseExtractor, ExtractorResult

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


class PaddleOCRExtractor(BaseExtractor):
    name = "paddleocr"
    display_name = "PaddleOCR extractor"
    aliases = ("paddle_ocr",)
    supported_content_types = SUPPORTED_CONTENT_TYPES
    supported_extensions = SUPPORTED_EXTENSIONS

    async def extractor_file(
        self,
        filepath: str | Path,
        **params: Any,
    ) -> ExtractorResult:
        path = self.ensure_supported(
            filepath,
            content_type=params.get("content_type"),
        )
        file_name = str(params.get("file_name") or path.name)
        api_url = str(params.get("paddle_ocr_api_url") or config.paddle_ocr_api_url).strip()
        if not api_url:
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error="PaddleOCR API URL is not configured.",
                metadata={"missing_config": "paddle_ocr_api_url"},
            )

        try:
            payload = await _call_paddle_ocr_api(
                api_url=api_url,
                filepath=path,
                file_name=file_name,
                content_type=self.resolve_content_type(
                    path,
                    content_type=params.get("content_type"),
                ),
                lang=str(params.get("lang", "ch")),
                timeout=float(
                    params.get("timeout_seconds")
                    or config.document_parser_api_timeout_seconds
                ),
            )
        except Exception as exc:
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error=f"PaddleOCR API extraction failed: {exc}",
                metadata={
                    "engine": "paddleocr-api",
                    "exception_type": type(exc).__name__,
                },
            )

        lines = _extract_text_lines(payload)
        return ExtractorResult(
            extractor=self.name,
            file_path=str(path),
            content="\n".join(lines),
            success=True,
            metadata={"engine": "paddleocr-api", "line_count": len(lines)},
        )


async def _call_paddle_ocr_api(
    *,
    api_url: str,
    filepath: Path,
    file_name: str,
    content_type: str,
    lang: str,
    timeout: float,
) -> Any:
    headers = _auth_headers(config.paddle_ocr_api_key)
    file_bytes = await asyncio.to_thread(filepath.read_bytes)
    files = {"file": (file_name, file_bytes, content_type)}
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            api_url,
            data={"lang": lang},
            files=files,
            headers=headers,
        )
    response.raise_for_status()
    return _decode_response(response)


def _auth_headers(api_key: str) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def _decode_response(response: httpx.Response) -> Any:
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        return response.json()
    try:
        return response.json()
    except ValueError:
        return response.text


def _extract_text_lines(payload: Any) -> list[str]:
    lines: list[str] = []
    _collect_text(payload, lines)
    return lines


def _collect_text(value: Any, lines: list[str]) -> None:
    if isinstance(value, str):
        if value.strip():
            lines.append(value.strip())
        return

    if isinstance(value, dict):
        for key in ("text", "rec_text", "content", "parsed_text"):
            text = value.get(key)
            if isinstance(text, str) and text.strip():
                lines.append(text.strip())
                return
        for key in ("lines", "pages", "result", "results", "data", "ocr_results"):
            if key in value:
                _collect_text(value[key], lines)
        return

    if isinstance(value, list):
        for item in value:
            _collect_text(item, lines)
