from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.utils.auth import verify_required_auth_settings
from src.database import postgres_manager
from src.storage import close_async_redis_client
from src.utils import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()

    await postgres_manager.initialize()
    await postgres_manager.create_schema()
    logger.info("FastAPI 服务已启动。")

    try:
        yield
    finally:
        await close_async_redis_client()
        await postgres_manager.dispose()
        logger.info("FastAPI 服务已关闭。")
