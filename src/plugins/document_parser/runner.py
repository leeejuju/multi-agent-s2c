from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Awaitable, Callable, Iterable, Sequence
from concurrent.futures import Executor, ThreadPoolExecutor
from threading import Event
from typing import Any, Final

from .base import (
    BlockingDocumentParser,
    DocumentParseEvent,
    DocumentParseRequest,
    DocumentParseResult,
    NoDocumentParserError,
)
from .factory import DocumentParserFactory

_SENTINEL: Final = object()
ResultWriter = Callable[[DocumentParseResult], Awaitable[Any]]


async def run_blocking_event_stream(
    producer: Callable[[Event], Iterable[DocumentParseEvent]],
    *,
    executor: Executor | None = None,
) -> AsyncGenerator[DocumentParseEvent, None]:
    """Bridge a blocking event producer into an async event stream."""

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[DocumentParseEvent | BaseException | object] = asyncio.Queue()
    stop_event = Event()

    def publish(item: DocumentParseEvent | BaseException | object) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, item)

    def worker() -> None:
        try:
            for event in producer(stop_event):
                if stop_event.is_set():
                    break
                publish(event)
        except BaseException as exc:
            publish(exc)
        finally:
            publish(_SENTINEL)

    future = loop.run_in_executor(executor, worker)

    try:
        while True:
            item = await queue.get()
            if item is _SENTINEL:
                break
            if isinstance(item, BaseException):
                raise item
            yield item
    finally:
        stop_event.set()
        if not future.done():
            future.cancel()


class DocumentParserRunner:
    """Reusable parser runner with a bounded thread pool."""

    def __init__(
        self,
        factory: DocumentParserFactory | None = None,
        *,
        max_workers: int = 4,
        executor: Executor | None = None,
    ) -> None:
        self.factory = factory or DocumentParserFactory.default()
        self._executor = executor or ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="document-parser",
        )
        self._owns_executor = executor is None

    async def parse(
        self,
        request: DocumentParseRequest,
    ) -> AsyncGenerator[DocumentParseEvent]:
        try:
            parser = self.factory.resolve(request)
        except NoDocumentParserError as exc:
            yield DocumentParseEvent.error(
                parser="factory",
                file_name=request.file_name,
                message=str(exc),
            )
            return

        try:
            if isinstance(parser, BlockingDocumentParser):
                async for event in parser.parse_with_executor(
                    request,
                    executor=self._executor,
                ):
                    yield event
            else:
                async for event in parser.parse(request):
                    yield event
        except Exception as exc:
            yield DocumentParseEvent.error(
                parser=parser.name,
                file_name=request.file_name,
                message=f"Document parser failed: {exc}",
                metadata={"exception_type": type(exc).__name__},
            )

    async def parse_many_as_completed(
        self,
        requests: Sequence[DocumentParseRequest],
        *,
        result_writer: ResultWriter | None = None,
    ) -> AsyncGenerator[DocumentParseResult]:
        """Parse documents concurrently and yield each result as soon as it completes.

        Blocking parser work runs in the thread pool. `result_writer` is awaited
        in the event loop after each document finishes, which is where async DB
        writes should happen.
        """

        futures = [
            self._executor.submit(self._parse_request_to_result, request)
            for request in requests
        ]
        async_futures = [asyncio.wrap_future(future) for future in futures]
        try:
            for completed in asyncio.as_completed(async_futures):
                result = await completed
                if result_writer is not None:
                    await result_writer(result)
                yield result
        finally:
            for future in futures:
                if not future.done():
                    future.cancel()

    def _parse_request_to_result(
        self,
        request: DocumentParseRequest,
    ) -> DocumentParseResult:
        try:
            parser = self.factory.resolve(request)
        except NoDocumentParserError as exc:
            event = DocumentParseEvent.error(
                parser="factory",
                file_name=request.file_name,
                message=str(exc),
            )
            return DocumentParseResult.from_events(
                request=request,
                parser="factory",
                events=(event,),
            )

        if isinstance(parser, BlockingDocumentParser):
            return self._parse_blocking_to_result(parser, request)

        events: list[DocumentParseEvent] = []
        events.append(
            DocumentParseEvent.error(
                parser=parser.name,
                file_name=request.file_name,
                message="Async document parsers are not supported by parse_many_as_completed.",
                metadata={"parser_type": type(parser).__name__},
            )
        )
        return DocumentParseResult.from_events(
            request=request,
            parser=parser.name,
            events=events,
        )

    def _parse_blocking_to_result(
        self,
        parser: BlockingDocumentParser,
        request: DocumentParseRequest,
    ) -> DocumentParseResult:
        stop_event = Event()
        events: list[DocumentParseEvent] = []
        try:
            events.extend(parser.parse_blocking(request, stop_event))
        except Exception as exc:
            events.append(
                DocumentParseEvent.error(
                    parser=parser.name,
                    file_name=request.file_name,
                    message=f"Document parser failed: {exc}",
                    metadata={"exception_type": type(exc).__name__},
                )
            )
        return DocumentParseResult.from_events(
            request=request,
            parser=parser.name,
            events=events,
        )

    def close(self) -> None:
        if self._owns_executor:
            self._executor.shutdown(wait=False, cancel_futures=True)

    async def aclose(self) -> None:
        self.close()



