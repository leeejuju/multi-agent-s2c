from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.service.agent_queue_service import close_queue_connections
from server.utils.auth import verify_required_auth_settings
from src.database import PostgreSQLInitializer, get_engine
from src.storage import ensure_storage_ready, verify_required_storage_settings
from src.utils import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()
    verify_required_storage_settings()

    engine = get_engine()
    await PostgreSQLInitializer(engine=engine).initialize()
    await ensure_storage_ready()

    logger.info("FastAPI 服务已启动。")

    yield


    await engine.dispose()
    await close_queue_connections()
    logger.info("FastAPI 服务已关闭。")
