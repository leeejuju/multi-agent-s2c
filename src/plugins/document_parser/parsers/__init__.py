from .docling import DoclingDocumentParser
from .docx import DocxDocumentParser
from .mineru import MineruDocumentParser
from .paddle_ocr import PaddleOcrDocumentParser

__all__ = [
    "DoclingDocumentParser",
    "DocxDocumentParser",
    "MineruDocumentParser",
    "PaddleOcrDocumentParser",
]
