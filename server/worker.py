from arq.connections import RedisSettings

from server.service.agent_consumer_service import execute_agent_run
from server.service.agent_queue_service import close_queue_connections
from src.configs import config


async def run_agent(ctx, run_id: str) -> None:
    await execute_agent_run(run_id)


class WorkerSettings:
    functions = [run_agent]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_shutdown = close_queue_connections
