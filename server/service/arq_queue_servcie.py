from __future__ import annotations

import json
from typing import Any

from src.configs import config
from src.storage import create_arq_pool, get_async_redis_client

_arq_pool = None


async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_arq_pool()
    return _arq_pool


def queue_event_stream_key(run_id: str) -> str:
    return f"run:events:{run_id}"


async def write_queue_event(
    run_id: str,
    event: dict[str, Any],
    *,
    ttl_seconds: int | None = None,
) -> str:
    redis_client = await get_async_redis_client()
    stream_key = queue_event_stream_key(run_id)
    event_id = await redis_client.xadd(
        stream_key,
        fields={"event": json.dumps(event, ensure_ascii=False)},
        maxlen=config.run_stream_max_len,
        approximate=True,
    )
    if ttl_seconds is not None:
        await redis_client.expire(stream_key, ttl_seconds)
    return event_id.decode() if isinstance(event_id, bytes) else str(event_id)


async def read_queue_events(
    run_id: str,
    *,
    after_id: str = "0-0",
    count: int | None = None,
    block_ms: int | None = None,
):
    redis = await get_async_redis_client()
    return await redis.xread(
        streams={queue_event_stream_key(run_id): after_id},
        count=count,
        block=config.run_stream_poll_timeout_ms if block_ms is None else block_ms,
    )
