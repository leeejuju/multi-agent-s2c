from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

from server.service.arq_queue_servcie import (
    get_arq_pool,
    queue_event_stream_key,
    read_queue_events,
    write_queue_event,
)
from src.storage import get_async_redis_client

RUN_REDIS_TTL_SECONDS = 24 * 60 * 60
_TERMINAL_EVENT_TYPES = {"done", "error", "cancelled"}


async def enqueue_agent_run(run_id: str) -> None:
    queue = await get_arq_pool()
    await queue.enqueue_job("process_agent_run", run_id, _job_id=f"run:{run_id}")


async def publish_agent_run_event(run_id: str, event: dict[str, Any]) -> str:
    return await write_queue_event(
        run_id,
        _build_agent_run_event(run_id, event),
        ttl_seconds=RUN_REDIS_TTL_SECONDS,
    )


async def read_agent_run_events(
    run_id: str,
    *,
    after_id: str = "0-0",
    count: int | None = None,
    block_ms: int | None = None,
) -> list[tuple[str, dict[str, Any]]]:
    rows = await read_queue_events(
        run_id,
        after_id=after_id,
        count=count,
        block_ms=block_ms,
    )
    events: list[tuple[str, dict[str, Any]]] = []
    for _, stream_events in rows:
        for event_id, fields in stream_events:
            events.append((_to_text(event_id), _decode_event_fields(fields)))
    return events


async def stream_agent_run_event(
    *,
    run_id: str,
    current_uid: str,
) -> AsyncIterator[str]:
    # ponytail: ownership check stays in the router/repository path; this only formats run events.
    _ = current_uid
    after_id = "0-0"
    while True:
        events = await read_agent_run_events(run_id, after_id=after_id)
        for event_id, payload in events:
            after_id = event_id
            yield _format_sse(event_id, payload)
            if payload.get("type") in _TERMINAL_EVENT_TYPES:
                return


async def cancel_agent_run(run_id: str, *, reason: str | None = None) -> None:
    redis = await get_async_redis_client()
    payload = _build_agent_run_event(
        run_id,
        {
            "type": "cancelled",
            "status": "cancelled",
            "reason": reason or "cancelled",
        },
    )
    await redis.set(
        agent_run_cancel_key(run_id),
        json.dumps(payload, ensure_ascii=False),
        ex=RUN_REDIS_TTL_SECONDS,
    )
    await write_queue_event(run_id, payload, ttl_seconds=RUN_REDIS_TTL_SECONDS)


async def is_agent_run_cancelled(run_id: str) -> bool:
    redis = await get_async_redis_client()
    return bool(await redis.exists(agent_run_cancel_key(run_id)))


def agent_run_event_stream_key(run_id: str) -> str:
    return queue_event_stream_key(run_id)


def agent_run_cancel_key(run_id: str) -> str:
    return f"run:cancel:{run_id}"


def _build_agent_run_event(run_id: str, event: dict[str, Any]) -> dict[str, Any]:
    payload = {**event, "scope": "agent_run", "run_id": run_id}
    payload.setdefault("created_at", datetime.now(UTC).isoformat())
    return payload


def _decode_event_fields(fields: dict[Any, Any]) -> dict[str, Any]:
    raw_event = fields.get("event") if "event" in fields else fields.get(b"event")
    if raw_event is None:
        return {}
    if isinstance(raw_event, bytes):
        raw_event = raw_event.decode()
    event = json.loads(raw_event)
    return event if isinstance(event, dict) else {"data": event}


def _format_sse(event_id: str, payload: dict[str, Any]) -> str:
    event_type = str(payload.get("type", "message"))
    data = json.dumps(payload, ensure_ascii=False)
    return f"id: {event_id}\nevent: {event_type}\ndata: {data}\n\n"


def _to_text(value: Any) -> str:
    return value.decode() if isinstance(value, bytes) else str(value)
