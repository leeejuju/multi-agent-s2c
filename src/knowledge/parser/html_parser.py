from __future__ import annotations

import asyncio
from pathlib import Path


class HtmlParser:
    name = "html"

    async def parse(
        self,
        filename: str | Path,
        *,
        encoding: str = "utf-8-sig",
        as_json: bool = False,
    ) -> str | dict[str, object]:
        html = await asyncio.to_thread(Path(filename).read_text, encoding=encoding)
        markdown, cleaned_html, elements = await asyncio.to_thread(
            _parse_html,
            html,
        )
        if not as_json:
            return markdown
        return {
            "markdown": markdown,
            "html": cleaned_html,
            "elements": elements,
        }


def _parse_html(html: str) -> tuple[str, str, list[dict[str, object]]]:
    from bs4 import BeautifulSoup
    from markdownify import markdownify

    soup = BeautifulSoup(html, "html.parser")
    for node in soup.find_all(["script", "style", "noscript", "template"]):
        node.decompose()
    root = soup.body or soup
    cleaned_html = str(root)
    markdown = markdownify(cleaned_html, heading_style="ATX").strip()
    elements = [
        {"type": node.name, "text": node.get_text(" ", strip=True)}
        for node in root.find_all(
            ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "a", "table"]
        )
    ]
    return markdown, cleaned_html, elements
