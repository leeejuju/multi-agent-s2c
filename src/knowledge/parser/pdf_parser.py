from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path
from typing import Any, BinaryIO


class PdfParseError(RuntimeError):
    pass


class BasePdfParser(ABC):
    engine = ""

    async def parse(
        self,
        filename: str | Path,
        *,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        path = Path(filename)
        try:
            pages = await self._extract_pages(path)
        except PdfParseError:
            raise
        except Exception as error:
            raise PdfParseError(
                f"{self.engine} failed with {type(error).__name__}."
            ) from error

        if path.stat().st_size and not any(page.strip() for page in pages):
            raise PdfParseError(f"{self.engine} returned no content.")
        if as_json:
            return {
                "engine": self.engine,
                "pages": [
                    {"page": page_number, "text": text}
                    for page_number, text in enumerate(pages, start=1)
                ],
            }
        return "\n\n".join(
            f"## Page {page_number}\n\n{text}".rstrip()
            for page_number, text in enumerate(pages, start=1)
        )

    @abstractmethod
    async def _extract_pages(
        self,
        path: Path,
    ) -> list[str]:
        """Extract text while preserving page order."""


class PlainPdfParser(BasePdfParser):
    engine = "pdfreader"

    async def extract_outlines(
        self,
        filename: str | Path,
    ) -> object | None:
        return await asyncio.to_thread(_read_pdf_outlines, Path(filename))

    async def _extract_pages(
        self,
        path: Path,
    ) -> list[str]:
        return await asyncio.to_thread(_read_pdf_pages, path)


class OcrPdfParser(BasePdfParser):
    engine = "paddleocr"

    def __init__(self, extractor: Any | None = None) -> None:
        if extractor is None:
            from src.knowledge.extractor import PaddleOCRExtractor

            extractor = PaddleOCRExtractor()
        self.extractor = extractor

    async def _extract_pages(
        self,
        path: Path,
    ) -> list[str]:
        result = await self.extractor.extractor_file(
            path,
            content_type="application/pdf",
            file_name=path.name,
        )
        if not result.success:
            raise PdfParseError(result.error or "PaddleOCR failed.")
        return result.content.split("\f")


class PdfParser:
    name = "pdf"

    def __init__(
        self,
        *,
        plain: BasePdfParser | None = None,
        ocr: BasePdfParser | None = None,
    ) -> None:
        self.plain = plain or PlainPdfParser()
        self.ocr = ocr

    async def parse(
        self,
        filename: str | Path,
        *,
        enable_ocr: bool = False,
        as_json: bool = False,
    ) -> str | dict[str, object]:
        if not enable_ocr:
            return await self.plain.parse(
                filename,
                as_json=as_json,
            )

        if self.ocr is None:
            self.ocr = OcrPdfParser()
        try:
            return await self.ocr.parse(
                filename,
                as_json=as_json,
            )
        except PdfParseError as ocr_error:
            try:
                result = await self.plain.parse(
                    filename,
                    as_json=as_json,
                )
            except PdfParseError as plain_error:
                raise PdfParseError(
                    "PDF OCR and plain parsing both failed: "
                    f"{type(ocr_error).__name__}, {type(plain_error).__name__}."
                ) from plain_error
            if isinstance(result, dict):
                return {
                    **result,
                    "fallback_used": True,
                    "ocr_error": str(ocr_error),
                }
            return result


def _read_pdf_pages(path: Path) -> list[str]:
    from pdfreader import SimplePDFViewer

    with _open_pdf_stream(path) as stream:
        viewer = SimplePDFViewer(stream)
        canvases = iter(viewer)
        pages: list[str] = []
        while True:
            try:
                canvas = next(canvases)
            except StopIteration:
                return pages
            pages.append("".join(canvas.strings).strip())


def _read_pdf_outlines(path: Path) -> object | None:
    from pdfreader import PDFDocument

    content = path.read_bytes()
    return PDFDocument(BytesIO(content.ljust(1024, b" "))).root.Outlines


def _open_pdf_stream(path: Path) -> BinaryIO:
    if path.stat().st_size < 1024:
        # ponytail: pdfreader seeks 1024 bytes from EOF; pad only tiny PDFs.
        content = path.read_bytes()
        return BytesIO(content + b" " * (1024 - len(content)))
    return path.open("rb")
