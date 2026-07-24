from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path
from typing import Any


class TableParser:
    name = "table"

    async def parse(
        self,
        filename: str | Path,
        *,
        encoding: str = "utf-8-sig",
        delimiter: str | None = None,
        sheets: Sequence[str] | None = None,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        is_excel, tables = await asyncio.to_thread(
            _read_tables,
            Path(filename),
            encoding,
            delimiter,
            list(sheets) if sheets is not None else None,
        )
        data = [_table_data(name, frame) for name, frame in tables.items()]
        if as_json:
            return {"tables": data}
        return "\n\n".join(
            (
                f"## {table['name']}\n\n{_markdown_table(table)}"
                if is_excel
                else _markdown_table(table)
            ).rstrip()
            for table in data
        )


def _read_tables(
    path: Path,
    encoding: str,
    delimiter: str | None,
    sheets: list[str] | None,
) -> tuple[bool, dict[str, Any]]:
    import pandas as pd

    if path.suffix.lower() == ".csv":
        try:
            frame = pd.read_csv(
                path,
                encoding=encoding,
                sep=delimiter,
                engine="python" if delimiter is None else "c",
                keep_default_na=False,
            )
        except pd.errors.EmptyDataError:
            frame = pd.DataFrame()
        return False, {path.stem: frame}
    if path.suffix.lower() == ".xlsx":
        return True, pd.read_excel(
            path,
            sheet_name=sheets,
            keep_default_na=False,
        )
    raise ValueError(f"Unsupported table file: {path.suffix}")


def _table_data(name: str, frame: Any) -> dict[str, object]:
    return {
        "name": name,
        "headers": [str(column) for column in frame.columns],
        "rows": frame.to_numpy().tolist(),
    }


def _markdown_table(table: dict[str, object]) -> str:
    headers = table["headers"]
    rows = table["rows"]
    if not headers:
        return ""

    def line(values: object) -> str:
        return "| " + " | ".join(
            str(value).replace("|", "\\|") for value in values  # type: ignore[union-attr]
        ) + " |"

    return "\n".join(
        [
            line(headers),
            line(["---"] * len(headers)),  # type: ignore[arg-type]
            *(line(row) for row in rows),  # type: ignore[union-attr]
        ]
    )
