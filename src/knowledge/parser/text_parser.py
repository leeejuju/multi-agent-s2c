from __future__ import annotations

import asyncio
from pathlib import Path


class TextParser:
    name = "txt"

    async def parse(
        self,
        filename: str | Path,
        *,
        encoding: str = "utf-8-sig",
        as_json: bool = False,
    ) -> str | dict[str, object]:
        text = await asyncio.to_thread(Path(filename).read_text, encoding=encoding)
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        if not as_json:
            return text
        return {
            "text": text,
            "paragraphs": [
                paragraph.strip()
                for paragraph in text.split("\n\n")
                if paragraph.strip()
            ],
        }
