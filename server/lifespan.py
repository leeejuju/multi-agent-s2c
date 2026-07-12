from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.utils.auth import verify_required_auth_settings
from src.agents import agent_manager
from src.database import postgres_manager
from src.database.repositories import AgentRepository
from src.storage import close_async_redis_client
from src.utils import logger


async def ensure_agents_exist() -> None:
    # FIXME: 业务 Agent 初始化放在 lifespan/repository，不放进只管连接生命周期的 PostgreManger。
    agents = agent_manager.list_top_level_agents()
    async with postgres_manager.get_async_session_context() as session:
        repository = AgentRepository(session)
        for agent in agents:
            await repository.ensure_agent_exists(
                slug=agent["id"],
                backend_id=agent["id"],
                name=agent["name"],
                description=agent["description"],
                role="orchestrator",
                internal_only=False,
            )
    logger.info("已确保顶层 Agent 存在：%s", ", ".join(item["id"] for item in agents))


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_required_auth_settings()

    await postgres_manager.initialize()
    # FIXME: 统一应用启动与 PostgreManger 当前暴露的建表入口。
    await postgres_manager.create_tables()
    # FIXME: 建表完成后立即同步 Agent 注册信息，首次访问无需手工插入数据。
    await ensure_agents_exist()
    logger.info("FastAPI 服务已启动。")

    try:
        yield
    finally:
        await close_async_redis_client()
        await postgres_manager.dispose()
        logger.info("FastAPI 服务已关闭。")
