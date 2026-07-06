import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from arq.connections import RedisSettings

from src.configs import config


async def startup(ctx) -> None:
    return


async def shutdown(ctx) -> None:
    return


async def process_agent_run(ctx, run_id: str) -> None:
    pass



class WorkerSettings:
    functions = [process_agent_run]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_startup = startup
    on_shutdown = shutdown
