import json
from collections.abc import Mapping
from typing import Any

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from redis.asyncio import ConnectionPool, Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.configs import config

_arq_pool: ArqRedis | None = None
_redis_client: Redis | None = None
_redis_pool: ConnectionPool | None = None


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(config.redis_url)


def _request_config_bool(
    request_config: Mapping[str, Any] | None,
    key: str,
    default: bool,
) -> bool:
    if request_config is None:
        return default
    value = request_config.get(key, request_config.get(f"agent_{key}", default))
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    if isinstance(value, int):
        return bool(value)
    return default


def agent_queue_enabled(request_config: Mapping[str, Any] | None = None) -> bool:
    return _request_config_bool(
        request_config,
        "enable_run_queue",
        config.enable_run_queue,
    )


def agent_stream_enabled(request_config: Mapping[str, Any] | None = None) -> bool:
    return agent_queue_enabled(request_config)


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
        "file_key": _attachment_value(attachment, "file_key"),
        "category": _attachment_value(attachment, "category"),
        "access_url": _attachment_value(attachment, "access_url", ""),
        "thumb_url": _attachment_value(attachment, "thumb_url"),
        "parser": _attachment_value(attachment, "parser"),
        "parse_status": _attachment_value(attachment, "parse_status"),
        "parse_error": _attachment_value(attachment, "parse_error"),
    }


def _run_stream_key(run_id: str) -> str:
    return f"run:{run_id}:events"


def _run_sequence_key(run_id: str) -> str:
    return f"run:{run_id}:sequence"


def json_line_event(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8") + b"\n"


async def publish_run_event(
    _session: AsyncSession,
    redis: Redis | None,
    *,
    run_id: str,
    event_type: str,
    payload: dict[str, Any],
    request_config: Mapping[str, Any] | None = None,
) -> dict[str, Any] | None:
    publish_stream = agent_stream_enabled(request_config)
    if not publish_stream:
        return None

    if redis is None:
        raise RuntimeError("Redis Stream publishing is enabled but no Redis client was provided.")

    sequence = int(await redis.incr(_run_sequence_key(run_id)))
    event_payload = {
        **payload,
        "sequence": sequence,
        "run_id": run_id,
        "type": event_type,
    }
    await redis.xadd(
        _run_stream_key(run_id),
        {"payload": json.dumps(event_payload, ensure_ascii=False, default=str)},
        maxlen=config.run_stream_max_len,
        approximate=True,
    )
    return event_payload


def run_stream_key(run_id: str) -> str:
    return _run_stream_key(run_id)
