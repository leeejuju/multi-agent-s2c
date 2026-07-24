from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path


class MarkdownParser:
    name = "md"

    async def parse(
        self,
        filename: str | Path,
        *,
        extensions: Sequence[str] = (),
        as_json: bool = False,
    ) -> str | dict[str, object]:
        text = await asyncio.to_thread(
            Path(filename).read_text,
            encoding="utf-8-sig",
        )
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        rendered, elements = await asyncio.to_thread(
            _render_markdown,
            text,
            tuple(extensions),
        )
        if not as_json:
            return text
        return {"markdown": text, "html": rendered, "elements": elements}


def _render_markdown(
    text: str,
    extensions: tuple[str, ...],
) -> tuple[str, list[dict[str, object]]]:
    import markdown
    from bs4 import BeautifulSoup

    html = markdown.markdown(text, extensions=list(extensions))
    soup = BeautifulSoup(html, "html.parser")
    elements: list[dict[str, object]] = []
    for node in soup.find_all(
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "table"]
    ):
        if node.name.startswith("h"):
            elements.append(
                {
                    "type": "heading",
                    "level": int(node.name[1]),
                    "text": node.get_text(" ", strip=True),
                }
            )
        elif node.name == "table":
            table_rows = [
                [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
                for row in node.find_all("tr")
            ]
            elements.append({"type": "table", "rows": table_rows})
        else:
            elements.append(
                {
                    "type": "list_item" if node.name == "li" else "paragraph",
                    "text": node.get_text(" ", strip=True),
                }
            )
    return html, elements
