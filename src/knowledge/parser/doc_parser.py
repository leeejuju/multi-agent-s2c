from __future__ import annotations

import asyncio
from pathlib import Path
from urllib.parse import urlparse

from src.configs.config import config


class DocParser:
    name = "doc"

    async def parse(
        self,
        filename: str | Path,
        *,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        path = Path(filename)
        response_text, response_type = await _request_tika(path)
        markdown, text = await asyncio.to_thread(
            _clean_tika_response,
            response_text,
            response_type,
        )
        if path.stat().st_size and not markdown:
            raise RuntimeError("Tika returned no content.")
        if as_json:
            return {"markdown": markdown, "text": text}
        return markdown


async def _request_tika(path: Path) -> tuple[str, str]:
    import httpx

    base_url = config.tika_server_url.strip()
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RuntimeError("TIKA_SERVER_URL is not configured or invalid.")
    endpoint = base_url.rstrip("/")
    if not endpoint.endswith("/tika"):
        endpoint += "/tika"

    content = await asyncio.to_thread(path.read_bytes)
    async with httpx.AsyncClient(
        timeout=float(config.document_parser_api_timeout_seconds)
    ) as client:
        response = await client.put(
            endpoint,
            content=content,
            headers={
                "Accept": "text/html",
                "Content-Type": "application/msword",
            },
        )
    response.raise_for_status()
    return response.text, response.headers.get("content-type", "")


def _clean_tika_response(raw: str, content_type: str) -> tuple[str, str]:
    if "html" not in content_type.lower() and "<html" not in raw.lower():
        text = raw.strip()
        return text, text

    from bs4 import BeautifulSoup
    from markdownify import markdownify

    soup = BeautifulSoup(raw, "html.parser")
    for node in soup.find_all(["script", "style", "noscript"]):
        node.decompose()
    root = soup.body or soup
    return markdownify(str(root), heading_style="ATX").strip(), root.get_text(
        "\n",
        strip=True,
    )
