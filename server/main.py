import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the project root (parent of `server/`) is on sys.path so that
# `src.*` packages are importable regardless of the working directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.router import api_router
from server.utils.auth import verify_required_auth_settings
from src.database import get_engine, initialize_database
from src.storage import ensure_storage_ready, verify_required_storage_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()
    verify_required_storage_settings()
    engine = get_engine()
    await initialize_database(engine)
    await ensure_storage_ready()
    print("FastAPI service started.")
    yield
    await engine.dispose()
    print("FastAPI service stopped.")


app = FastAPI(
    title="multi-agent-s2c",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    uvicorn.run("server.main:app", host="localhost", port=5050, reload=True)
