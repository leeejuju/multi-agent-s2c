from __future__ import annotations

import asyncio
from dataclasses import dataclass

from redis.asyncio import Redis

from src.configs import config as sys_config

_redis_client: Redis | None = None
_redis_client_lock = asyncio.Lock()


@dataclass(frozen=True)
class RedisConfig:
    default_url: str = sys_config.redis_url
    max_connections: int = sys_config.redis_pool_max_connections

    @classmethod
    def from_config(cls) -> RedisConfig:
        return cls(
            default_url=sys_config.redis_url or "",
            max_connections=sys_config.redis_pool_max_connections or 20,
        )


async def create_arq_pool():
    from arq.connections import RedisSettings, create_pool

    config = RedisConfig.from_config()
    return await create_pool(RedisSettings.from_dsn(config.default_url))


async def get_async_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        async with _redis_client_lock:
            if _redis_client is None:
                config = RedisConfig.from_config()
                _redis_client = Redis.from_url(
                    config.default_url,
                    max_connections=config.max_connections,
                    decode_responses=False,
                )
    return _redis_client


async def close_async_redis_client() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
