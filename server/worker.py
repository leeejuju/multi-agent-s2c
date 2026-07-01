import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from arq.connections import RedisSettings

from server.service.agent_queue_service import close_queue_connections
from src.configs import config


async def startup(ctx) -> None:
    return


async def shutdown(ctx) -> None:
    await close_queue_connections()


async def run_agent(ctx, run_id: str) -> None:
    raise RuntimeError("Agent consumer service has been removed.")


class WorkerSettings:
    functions = [run_agent]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_startup = startup
    on_shutdown = shutdown
