from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from src.configs import config
from src.storage import create_arq_pool, get_async_redis_client

_arq_pool = None


async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_arq_pool()
    return _arq_pool


def build_run_event_msg(run_id:str, event_type:str, payload:dict, thread_id:str):
    return
    

def queue_event_stream_key(run_id: str) -> str:
    return f"run:events:{run_id}"


async def write_agent_run_stream_event(
    run_id: str,
    payload: dict,
    event_type: str,
    thread_id: str,
) -> str:
    """将 agent 产生的事件写入队列

    Args:
        run_id (str): 事件id
        payload (dict): agent run 附带数据
        event_type (str): agent run 当前状态
        thread_id (str): 会话ID
    """
    redis_client = await get_async_redis_client()
    stream_key = queue_event_stream_key(run_id)
    
    # 构建事件包
    event_pack = {
        "run_id": run_id,
        "payload": payload or {},
        "thread_id": thread_id,
        "event_type": event_type,
        "created_at": datetime.now(tz=UTC)
    }
    
    fields={"event_type":event_type,
            "payload": json.dumps(event_pack, ensure_ascii=False),
            },

    # fixme 后续需要设置检查点
    event_id = await redis_client.xadd(
        stream_key,
        fields=fields,
        maxlen=config.run_stream_max_len,
        approximate=True,
    )

    return event_id.decode() if isinstance(event_id, bytes) else str(event_id)


async def read_agent_run_events(
    run_id: str,
    *,
    after_id: str = "0-0",
    count: int | None = None,
    block_ms: int | None = None,
):
    redis = await get_async_redis_client()
    return await redis.xread(
        streams={queue_event_stream_key(run_id): after_id},
        count=count,
        block=config.run_stream_poll_timeout_ms if block_ms is None else block_ms,
    )
