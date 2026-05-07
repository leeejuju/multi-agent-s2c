from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.utils.auth import verify_required_auth_settings
from src.agents.common import BaseAgent
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

    await BaseAgent.setup_checkpointer()
    logger.info("FastAPI 服务已启动。")

    yield

    await BaseAgent.teardown_checkpointer()
    await engine.dispose()
    logger.info("FastAPI 服务已关闭。")
