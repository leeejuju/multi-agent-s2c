import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_auth_middleware import AuthMiddleware

# Ensure the project root (parent of `server/`) is on sys.path so that
# `src.*` packages are importable regardless of the working directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.router import protected_api_router, public_api_router
from server.utils.auth import verify_authorization_header, verify_required_auth_settings
from src.database import Base, get_engine


protected_app = FastAPI()
protected_app.add_middleware(
    AuthMiddleware,
    verify_authorization_header=verify_authorization_header,
)
protected_app.include_router(protected_api_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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

app.include_router(public_api_router, prefix="/api")
app.mount("/api", protected_app)


if __name__ == "__main__":
    uvicorn.run("server.main:app", host="localhost", port=8000, reload=True)
