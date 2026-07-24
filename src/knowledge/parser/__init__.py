from .doc_parser import DocParser
from .docx_parser import DocxParser
from .html_parser import HtmlParser
from .image_parser import ImageParser
from .markdown_parser import MarkdownParser
from .pdf_parser import PdfParser
from .pptx_parser import PptxParser
from .registry import PARSER_REGISTRY, resolve_parser
from .service import get_parser
from .table_parser import TableParser
from .text_parser import TextParser

__all__ = [
    "DocParser",
    "DocxParser",
    "HtmlParser",
    "ImageParser",
    "MarkdownParser",
    "PARSER_REGISTRY",
    "PdfParser",
    "PptxParser",
    "TableParser",
    "TextParser",
    "get_parser",
    "resolve_parser",
]
