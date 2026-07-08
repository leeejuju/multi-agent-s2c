import asyncio
import sys

from arq.connections import RedisSettings

from src.configs import config
from src.database import postgres_manager
from src.database.models import AgentRun
from src.database.repositories import AgentRunRepository
from src.utils import logger

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def startup(ctx) -> None:
    return


async def shutdown(ctx) -> None:
    return


async def _get_agent_run_id(run_id: str):
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        return await agent_run_repo.get_run_event_by_id(run_id)


async def process_agent_run(ctx, run_id: str):
    run_event: AgentRun | None = await _get_agent_run_id(run_id)
    if run_event is None:
        logger.error(f"当前agent运行id：{run_id} 不存在")
        return

    if run_event.status == "completed":
        return run_event


class WorkerSettings:
    functions = [process_agent_run]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_startup = startup
    on_shutdown = shutdown
