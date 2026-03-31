from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.utils import logger, verify_required_auth_settings
from src.database import PostgreSQLInitializer, get_engine
from src.storage import ensure_storage_ready, verify_required_storage_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()
    verify_required_storage_settings()

    engine = get_engine()
    await PostgreSQLInitializer(engine=engine).initialize()
    await ensure_storage_ready()
    logger.info("FastAPI service started.")

    yield

    await engine.dispose()
    logger.info("FastAPI service stopped.")
