from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx

from src.configs.config import config

from .base import BaseExtractor, ExtractorResult

SUPPORTED_CONTENT_TYPES = (
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/*",
)
SUPPORTED_EXTENSIONS = (
    ".pdf",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
)


class MinerUExtractor(BaseExtractor):
    name = "mineru"
    display_name = "MinerU extractor"
    aliases = ("mineur",)
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
        api_url = str(params.get("mineru_api_url") or config.mineru_api_url).strip()
        if not api_url:
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error="MinerU API URL is not configured.",
                metadata={"missing_config": "mineru_api_url"},
            )

        backend = str(params.get("mineru_backend") or params.get("backend") or "pipeline")
        try:
            payload = await _call_mineru_api(
                api_url=_resolve_mineru_api_url(api_url),
                filepath=path,
                file_name=file_name,
                content_type=self.resolve_content_type(
                    path,
                    content_type=params.get("content_type"),
                ),
                backend=backend,
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
                error=f"MinerU API extraction failed: {exc}",
                metadata={
                    "engine": "mineru-api",
                    "backend": backend,
                    "exception_type": type(exc).__name__,
                },
            )

        content = _extract_markdown(payload)
        if not content.strip():
            return ExtractorResult(
                extractor=self.name,
                file_path=str(path),
                success=False,
                error="MinerU API completed but no extractable content was found.",
                metadata={"engine": "mineru-api", "backend": backend},
            )

        return ExtractorResult(
            extractor=self.name,
            file_path=str(path),
            content=content,
            success=True,
            metadata={"engine": "mineru-api", "backend": backend},
        )


async def _call_mineru_api(
    *,
    api_url: str,
    filepath: Path,
    file_name: str,
    content_type: str,
    backend: str,
    timeout: float,
) -> Any:
    headers = _auth_headers(config.mineru_api_key)
    file_bytes = await asyncio.to_thread(filepath.read_bytes)
    files = {"files": (file_name, file_bytes, content_type)}
    data = {
        "backend": backend,
        "is_json_md_dump": "true",
        "return_md": "true",
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(api_url, data=data, files=files, headers=headers)
    response.raise_for_status()
    return _decode_response(response)


def _resolve_mineru_api_url(api_url: str) -> str:
    parsed = urlparse(api_url)
    if parsed.path and parsed.path != "/":
        return api_url
    return urlunparse(parsed._replace(path="/file_parse"))


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


def _extract_markdown(payload: Any) -> str:
    if isinstance(payload, str):
        return payload

    if isinstance(payload, dict):
        for key in (
            "markdown",
            "md",
            "md_content",
            "content",
            "parsed_text",
            "text",
        ):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value

        parts: list[str] = []
        for key in ("pages", "results", "result", "data"):
            if key in payload:
                text = _extract_markdown(payload[key])
                if text.strip():
                    parts.append(text)
        return "\n\n".join(parts)

    if isinstance(payload, list):
        return "\n\n".join(
            text for item in payload if (text := _extract_markdown(item)).strip()
        )

    return ""
