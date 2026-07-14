import asyncio
import sys
from typing import Any

from arq.connections import RedisSettings
from sqlalchemy import select

from server.service.agent_run_service import publish_agent_run_event
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


async def set_run_running(run_id: str) -> None:
    # FIXME: Worker 开始执行时单独设置 running 状态。
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        await agent_run_repo.set_running(run_id)


async def set_run_completed(run_id: str) -> None:
    # FIXME: Worker 正常结束时单独设置 completed 状态。
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        await agent_run_repo.set_completed(run_id)


async def set_run_failed(run_id: str, error: str) -> None:
    # FIXME: Worker 执行失败时单独设置 failed 状态。
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        await agent_run_repo.set_failed(run_id, error)


async def set_run_cancelled(run_id: str) -> None:
    # FIXME: Worker 被打断时单独设置 cancelled 状态。
    async with postgres_manager.get_async_session_context() as db:
        agent_run_repo = AgentRunRepository(db)
        await agent_run_repo.set_cancelled(run_id)




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
    
    
async def write_agent_run_event(
    run_id: str,
    payload: Any,
    event_type: str,
    thread_id: str,
) -> None:
    await publish_agent_run_event(
        run_id,
        {
            "type": event_type,
            "thread_id": thread_id,
            "payload": payload,
        },
    )


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
        error_message = (
            f"Input message not found: {agent_run_event.trigger_message_id}"
        )
        logger.error(
            f"当前agent运行id：{run_id} 的输入消息不存在："
            f"{agent_run_event.trigger_message_id}"
        )
        await set_run_failed(run_id, error_message)
        await publish_agent_run_event(
            run_id,
            {
                "type": "error",
                "status": "failed",
                "thread_id": agent_run_event.thread_id,
                "error": error_message,
            },
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
        error_message = f"User not found: {uid}"
        await set_run_failed(run_id, error_message)
        await publish_agent_run_event(
            run_id,
            {
                "type": "error",
                "status": "failed",
                "thread_id": thread_id,
                "error": error_message,
            },
        )
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

    await set_run_running(run_id)
    await publish_agent_run_event(
        run_id,
        {
            "type": "running",
            "status": "running",
            "thread_id": thread_id,
        },
    )
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

            async for event_type, payload in stream_thread_events:
                logger.info(
                    f"Agent run 事件输出：run_id={run_id}, "
                    f"event_type={event_type}, payload={payload}"
                )
                await write_agent_run_event(
                    run_id=run_id,
                    payload=payload,
                    event_type=event_type,
                    thread_id=thread_id,  # ty:ignore[invalid-argument-type]
                )
    except Exception as exc:
        await set_run_failed(run_id, str(exc))
        try:
            await publish_agent_run_event(
                run_id,
                {
                    "type": "error",
                    "status": "failed",
                    "thread_id": thread_id,
                    "error": str(exc),
                },
            )
        except Exception:
            logger.exception(f"Agent run 错误事件发布失败：{run_id}")
        logger.exception(f"Agent run 执行失败：{run_id}")
        raise

    await set_run_completed(run_id)
    await publish_agent_run_event(
        run_id,
        {
            "type": "done",
            "status": "completed",
            "thread_id": thread_id,
        },
    )
    return {"run_id": run_id, "status": "completed"}



class WorkerSettings:
    functions = [process_agent_run]
    queue_name = config.arq_queue_name
    redis_settings = RedisSettings.from_dsn(config.redis_url)
    max_jobs = config.arq_max_jobs
    on_startup = startup
    on_shutdown = shutdown
