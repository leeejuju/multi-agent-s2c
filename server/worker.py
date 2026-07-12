import asyncio
import sys

from arq.connections import RedisSettings
from sqlalchemy import select

from server.service.thread_service import AgentInputMsg, stream_agent_response
from src.configs import config
from src.database import postgres_manager
from src.database.models import AgentRun, Message, User
from src.database.repositories import AgentRunRepository
from src.utils import logger

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def startup(ctx) -> None:
    # FIXME: ARQ Worker 是独立进程，不能复用 FastAPI lifespan 初始化的数据库资源。
    await postgres_manager.initialize()


async def shutdown(ctx) -> None:
    # FIXME: Worker 退出时释放自己持有的 PostgreSQL engine。
    await postgres_manager.dispose()


async def transition_run_status(
    run_id: str,
    status: str,
    *,
    error: str | None = None,
) -> None:
    # FIXME: Worker 的开始、完成和失败状态统一通过 repository 落库。
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        await agent_run_repo.transit_status(run_id, status, error=error)




async def _get_user(uid: str) -> User | None:
    """获取到当前前的user
    """
    async with postgres_manager.get_async_session_context() as db:
        result = await db.execute(select(User).where(User.uid == uid))
        return result.scalar_one_or_none()

async def _get_agent_input_msg(message_id: int | None) -> Message | None:
    async with postgres_manager.get_async_session_context() as db:
        result = await db.execute(select(Message).where(Message.id == message_id))
        return result.scalar_one_or_none()


async def _get_agent_run_id(run_id: str):
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        return await agent_run_repo.get_run_event_by_id(run_id)


async def process_agent_run(ctx, run_id: str):
    agent_run_event: AgentRun | None = await _get_agent_run_id(run_id)
    if agent_run_event is None:
        logger.error(f"当前agent运行id：{run_id} 不存在")
        return

    # FIXME: agent_status 是当前 run 生命周期的事实字段，避免再读取旧 status 默认值。
    if agent_run_event.agent_status == "completed":
        return {"run_id": run_id, "status": "completed"}

    agent_input_message = await _get_agent_input_msg(
        message_id=agent_run_event.trigger_message_id  # ty:ignore[invalid-argument-type]
    )  # ty:ignore[invalid-argument-type]
    if agent_input_message is None:
        logger.error(
            f"当前agent运行id：{run_id} 的输入消息不存在："
            f"{agent_run_event.trigger_message_id}"
        )
        await transition_run_status(
            run_id,
            "failed",
            error=f"Input message not found: {agent_run_event.trigger_message_id}",
        )
        return {"run_id": run_id, "status": "failed"}

    # 构建agent内部的参数
    uid = agent_run_event.uid
    agent_slug = agent_run_event.agent_id
    request_id = agent_run_event.request_id
    thread_id = agent_run_event.thread_id

    image_content = agent_input_message.image_content  # ty:ignore[unresolved-attribute]

    # 构建访问消息
    agent_input_message_formatted = AgentInputMsg(
        content=agent_input_message.content,  # ty:ignore[invalid-argument-type]
        # FIXME: 恢复数据库里记录的输入消息类型，而不是传空字符串。
        msg_type=agent_input_message.message_type,  # ty:ignore[invalid-argument-type]
        image_content=image_content,  # ty:ignore[invalid-argument-type]
    )

    # 配置整体metadata
    user = await _get_user(uid=uid)  # ty:ignore[invalid-argument-type]

    if not user:
        await transition_run_status(run_id, "failed", error=f"User not found: {uid}")
        return {"run_id": run_id, "status": "failed"}

    # FIXME: 当前最小闭环只执行顶层 Agent，因此显式声明 father run_type。
    metadata = {
        "run_id": run_id,
        "request_id": request_id,
        "agent_slug": agent_slug,
        "thread_id": thread_id,
        "uid": user.uid,  # ty:ignore[unresolved-attribute]
        "run_type": "father",
    }

    await transition_run_status(run_id, "running")
    try:
        async with postgres_manager.get_async_session_context() as db:
            stream_thread_events = stream_agent_response(
                agent_slug=agent_slug,  # ty:ignore[invalid-argument-type]
                thread_id=thread_id,  # ty:ignore[invalid-argument-type]
                runtime_metadata=metadata,
                thread_input_message=agent_input_message_formatted,
                current_user=user,
                db=db,
            )

            # FIXME: 当前验证阶段只消费并打印，不发布 Redis Stream，也不推送前端。
            async for stream_thread_event in stream_thread_events:
                print(f"[run_id={run_id}] {stream_thread_event}", flush=True)
    except Exception as exc:
        await transition_run_status(run_id, "failed", error=str(exc))
        logger.exception(f"Agent run 执行失败：{run_id}")
        raise

    await transition_run_status(run_id, "completed")
    return {"run_id": run_id, "status": "completed"}



class WorkerSettings:
    functions = [process_agent_run]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_startup = startup
    on_shutdown = shutdown
