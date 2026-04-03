import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 确保项目根目录（server/ 的父目录）在 sys.path 中
# 这样无论当前工作目录在哪里，都能正确导入 src.* 包。
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.lifespan import lifespan
from server.router import api_router


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
