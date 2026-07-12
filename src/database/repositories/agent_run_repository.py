from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AgentRun


class AgentRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_agent_run(
        self,
        *,
        run_id: str,
        thread_id: str,
        conversation_id: int | str,
        uid: str,
        agent_id: str,
        request_id: str,
        trigger_message_id: int,
        agent_status: str = "pending",
        parent_run_id: str | None = None,
    ) -> AgentRun:
        # FIXME: run 必须保存触发消息主键，Worker 才能只凭 run_id 恢复输入。
        run = AgentRun(
            id=run_id,
            thread_id=thread_id,
            conversation_id=int(conversation_id),
            uid=uid,
            agent_id=agent_id,
            request_id=request_id,
            trigger_message_id=trigger_message_id,
            agent_status=agent_status,
            status=agent_status,
            parent_run_id=parent_run_id,
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def get_run_by_request_id(self, request_id: str) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun).where(AgentRun.request_id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_run_event_by_id(self, run_id: str) -> AgentRun | None:
        """看当前的run_id是否落库了"""
        result = await self.session.execute(select(AgentRun).where(AgentRun.id == run_id))
        return result.scalar_one_or_none()

    async def transit_status(
        self,
        run_id: str,
        status: str,
        *,
        error: str | None = None,
    ) -> AgentRun | None:
        # FIXME: 原型期同步维护两个状态字段，后续应删除重复的 status 字段。
        run = await self.session.get(AgentRun, run_id)
        if run is None:
            return None

        now = datetime.now(UTC)
        run.agent_status = status
        run.status = status
        if status == "running" and run.started_at is None:
            run.started_at = now
        if status in {"completed", "failed", "cancelled"}:
            run.finished_at = now
        run.error = error
        await self.session.flush()
        return run
