from __future__ import annotations

from collections.abc import Iterable

from .base import BaseDocumentParser, DocumentParseRequest, NoDocumentParserError


class DocumentParserFactory:
    """Registry and resolver for document parser plugins."""

    def __init__(self, parsers: Iterable[BaseDocumentParser] | None = None) -> None:
        self._parsers: list[BaseDocumentParser] = []
        self._by_name: dict[str, BaseDocumentParser] = {}
        for parser in parsers or ():
            self.register(parser)

    @classmethod
    def default(cls) -> DocumentParserFactory:
        from .parsers import (
            DoclingDocumentParser,
            DocxDocumentParser,
            MineruDocumentParser,
            PaddleOcrDocumentParser,
        )

        return cls(
            [
                DoclingDocumentParser(),
                MineruDocumentParser(),
                PaddleOcrDocumentParser(),
                DocxDocumentParser(),
            ]
        )

    @property
    def parsers(self) -> tuple[BaseDocumentParser, ...]:
        return tuple(self._parsers)

    def register(self, parser: BaseDocumentParser) -> None:
        if parser.name in self._by_name:
            raise ValueError(f"Document parser already registered: {parser.name}")
        self._parsers.append(parser)
        self._by_name[parser.name] = parser

    def resolve(self, request: DocumentParseRequest) -> BaseDocumentParser:
        if request.parser_name:
            parser = self._by_name.get(request.parser_name)
            if parser is None:
                raise NoDocumentParserError(
                    f"Unknown document parser: {request.parser_name}"
                )
            return parser

        for parser in self._parsers:
            if parser.supports(request):
                return parser

        raise NoDocumentParserError(
            "No document parser supports "
            f"file_name={request.file_name!r}, content_type={request.content_type!r}."
        )
