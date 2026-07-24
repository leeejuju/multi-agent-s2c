from __future__ import annotations

import csv
import io
import re

from .common import lines, table_cells
from .naive import clean_naive
from .types import CleanedChunk


def clean_table(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    rows = parse_markdown_table(text) or parse_delimited_table(text)
    chunks = []
    for index, row in enumerate(rows):
        content = "\n".join(
            f"- {key}: {value}" for key, value in row.items() if str(value).strip()
        )
        if content:
            chunks.append(CleanedChunk(content, "table_row", {"row": index + 1}))
    return chunks or clean_naive(text, chunk_size=chunk_size)


def parse_markdown_table(text: str) -> list[dict[str, str]]:
    table_lines: list[str] = [line for line in lines(text) if "|" in line]
    rows: list[dict[str, str]] = []
    for index in range(len(table_lines) - 2):
        header: list[str] = table_cells(line=table_lines[index])
        divider: list[str] = table_cells(line=table_lines[index + 1])
        if not header or not divider or not all(
            re.fullmatch(pattern=r":?-{3,}:?", string=cell) for cell in divider
        ):
            continue
        for row_line in table_lines[index + 2 :]:
            cells: list[str] = table_cells(row_line)
            if len(cells) != len(header):
                break
            rows.append(dict(zip(header, cells, strict=False)))
        if rows:
            break
    return rows


def parse_delimited_table(text: str) -> list[dict[str, str]]:
    sample: str = "\n".join(lines(text)[:20])
    try:
        dialect: type[csv.Dialect] = csv.Sniffer().sniff(sample, delimiters=",\t;")
    except csv.Error:
        dialect = csv.excel_tab if "\t" in sample else csv.excel

    reader = csv.reader(io.StringIO(text), dialect)
    rows = [row for row in reader if any(cell.strip() for cell in row)]
    if len(rows) < 2:
        return []
    headers = [
        header.strip() or f"Column_{index + 1}"
        for index, header in enumerate(rows[0])
    ]
    return [
        dict(zip(headers, [cell.strip() for cell in row], strict=False))
        for row in rows[1:]
        if len(row) == len(headers)
    ]
