from __future__ import annotations

import asyncio
from pathlib import Path


class DocxParser:
    name = "docx"

    async def parse(
        self,
        filename: str | Path,
        *,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        path = Path(filename)
        try:
            parsed = await asyncio.to_thread(_parse_with_python_docx, path)
        except Exception as primary_error:
            try:
                parsed = await asyncio.to_thread(_parse_with_docling, path)
            except Exception as fallback_error:
                raise RuntimeError(
                    "DOCX parsing failed with python-docx "
                    f"({type(primary_error).__name__}) and Docling "
                    f"({type(fallback_error).__name__})."
                ) from fallback_error
        return parsed if as_json else str(parsed["markdown"])


def _parse_with_python_docx(path: Path) -> dict[str, object]:
    from docx import Document
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = Document(path)
    markdown_parts: list[str] = []
    elements: list[dict[str, object]] = []
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            paragraph = Paragraph(child, document)
            text = paragraph.text.strip()
            if not text:
                continue
            style = paragraph.style.name if paragraph.style is not None else ""
            if style.startswith("Heading "):
                level_text = style.removeprefix("Heading ")
                level = int(level_text) if level_text.isdigit() else 1
                markdown_parts.append(f"{'#' * min(level, 6)} {text}")
                elements.append({"type": "heading", "level": level, "text": text})
            elif style.startswith("List"):
                markdown_parts.append(f"- {text}")
                elements.append({"type": "list_item", "text": text})
            else:
                markdown_parts.append(text)
                elements.append({"type": "paragraph", "text": text})
        elif isinstance(child, CT_Tbl):
            table = Table(child, document)
            rows = [[cell.text.strip() for cell in row.cells] for row in table.rows]
            if rows:
                markdown_parts.append(_markdown_table(rows))
                elements.append({"type": "table", "rows": rows})

    markdown = "\n\n".join(markdown_parts).strip()
    if path.stat().st_size and not markdown:
        raise ValueError("python-docx returned no content.")
    return {"engine": "python-docx", "markdown": markdown, "elements": elements}


def _parse_with_docling(path: Path) -> dict[str, object]:
    from docling.document_converter import DocumentConverter

    markdown = DocumentConverter().convert(path).document.export_to_markdown().strip()
    if path.stat().st_size and not markdown:
        raise ValueError("Docling returned no content.")
    return {"engine": "docling", "markdown": markdown}


def _markdown_table(rows: list[list[str]]) -> str:
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]

    def line(values: list[str]) -> str:
        return "| " + " | ".join(value.replace("|", "\\|") for value in values) + " |"

    return "\n".join(
        [line(padded[0]), line(["---"] * width), *(line(row) for row in padded[1:])]
    )
