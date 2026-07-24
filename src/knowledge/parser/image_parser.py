from __future__ import annotations

from pathlib import Path
from typing import Any

from src.knowledge.extractor import ExtractorFactory


class ImageParser:
    name = "image"

    def __init__(self, factory: ExtractorFactory | None = None) -> None:
        self.factory = factory or ExtractorFactory.default()

    async def parse(
        self,
        filename: str | Path,
        *,
        engine: str | None = None,
        content_type: str | None = None,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        path = Path(filename)
        if engine is not None:
            result = await self.factory.extractor_file(
                path,
                extractor_type=engine,
                content_type=content_type,
            )
            if not result.success or not result.content.strip():
                raise RuntimeError(result.error or f"{engine} returned no content.")
            return _format_result(result, as_json)

        failures: list[str] = []
        for extractor in self.factory.extractors:
            try:
                result = await extractor.extractor_file(
                    path,
                    content_type=content_type,
                )
            except Exception as error:
                failures.append(f"{type(extractor).__name__}: {type(error).__name__}")
                continue
            if result.success and result.content.strip():
                return _format_result(result, as_json)
            failures.append(
                f"{type(extractor).__name__}: {result.error or 'empty result'}"
            )
        raise RuntimeError("All image OCR engines failed: " + "; ".join(failures))


def _format_result(result: Any, as_json: bool) -> str | dict[str, object]:
    if not as_json:
        return str(result.content)
    return {
        "engine": str(result.extractor),
        "lines": str(result.content).splitlines(),
        "metadata": dict(result.metadata),
    }
