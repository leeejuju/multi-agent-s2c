import json
from collections.abc import AsyncIterator, Mapping
from typing import Any

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from redis.asyncio import ConnectionPool, Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.configs import config
from src.database.models import RunEvent
from src.database.repositories import RunRepository

_arq_pool: ArqRedis | None = None
_redis_client: Redis | None = None
_redis_pool: ConnectionPool | None = None


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(config.redis_url)


async def get_arq_pool() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(
            redis_settings(),
            default_queue_name=config.arq_queue_name,
        )
    return _arq_pool


def get_redis_client() -> Redis:
    global _redis_client, _redis_pool
    if _redis_client is None:
        _redis_pool = ConnectionPool.from_url(
            config.redis_url,
            decode_responses=True,
            max_connections=config.redis_pool_max_connections,
        )
        _redis_client = Redis(connection_pool=_redis_pool)
    return _redis_client


async def close_queue_connections() -> None:
    global _arq_pool, _redis_client, _redis_pool
    if _arq_pool is not None:
        await _arq_pool.close()
        _arq_pool = None
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


def _attachment_value(attachment: Any, key: str, default: Any = None) -> Any:
    if isinstance(attachment, Mapping):
        return attachment.get(key, default)
    return getattr(attachment, key, default)


def serialize_attachment_for_chat(attachment: Any) -> dict[str, Any]:
    return {
        "id": _attachment_value(attachment, "id", ""),
        "file_name": _attachment_value(attachment, "file_name", "Attachment"),
        "content_type": _attachment_value(
            attachment,
            "content_type",
            "application/octet-stream",
        ),
        "file_size": _attachment_value(attachment, "file_size"),
        "object_key": _attachment_value(attachment, "object_key"),
        "category": _attachment_value(attachment, "category"),
        "access_url": _attachment_value(attachment, "access_url", ""),
        "thumb_url": _attachment_value(attachment, "thumb_url"),
        "parser": _attachment_value(attachment, "parser"),
        "parse_status": _attachment_value(attachment, "parse_status"),
        "parse_error": _attachment_value(attachment, "parse_error"),
    }


def _run_stream_key(run_id: str) -> str:
    return f"run:{run_id}:events"


def serialize_run_event(event: RunEvent) -> dict[str, Any]:
    return {
        **event.payload,
        "sequence": event.sequence,
        "run_id": str(event.run_id),
        "type": event.type,
    }


def json_line_event(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8") + b"\n"


async def publish_run_event(
    session: AsyncSession,
    redis: Redis,
    *,
    run_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> RunEvent:
    repository = RunRepository(session)
    event = await repository.add_event(
        run_id=run_id,
        event_type=event_type,
        payload=payload,
    )
    await repository.commit()
    await redis.xadd(
        _run_stream_key(run_id),
        {"payload": json.dumps(serialize_run_event(event), ensure_ascii=False, default=str)},
        maxlen=config.run_stream_max_len,
        approximate=True,
    )
    return event


async def iter_persisted_run_events(
    session: AsyncSession,
    *,
    run_id: str,
    after_sequence: int,
) -> AsyncIterator[dict[str, Any]]:
    repository = RunRepository(session)
    for event in await repository.list_events_after(run_id, after_sequence):
        yield serialize_run_event(event)


def run_stream_key(run_id: str) -> str:
    return _run_stream_key(run_id)
