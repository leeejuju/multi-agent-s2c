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

    # FIXME: AgentRun 各状态使用独立方法，避免调用方传入任意状态字符串。
    async def set_running(self, run_id: str) -> AgentRun | None:
        run = await self.session.get(AgentRun, run_id)
        if run is None:
            return None

        run.agent_status = "running"
        run.status = "running"
        run.started_at = run.started_at or datetime.now(UTC)
        run.error = None
        await self.session.flush()
        return run

    # FIXME: AgentRun 完成状态单独设置，便于明确维护结束时间。
    async def set_completed(self, run_id: str) -> AgentRun | None:
        run = await self.session.get(AgentRun, run_id)
        if run is None:
            return None

        run.agent_status = "completed"
        run.status = "completed"
        run.finished_at = datetime.now(UTC)
        run.error = None
        await self.session.flush()
        return run

    # FIXME: AgentRun 错误状态单独设置并保存错误信息。
    async def set_failed(self, run_id: str, error: str) -> AgentRun | None:
        run = await self.session.get(AgentRun, run_id)
        if run is None:
            return None

        run.agent_status = "failed"
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.error = error
        await self.session.flush()
        return run

    # FIXME: AgentRun 打断状态单独设置，保持与 run event 的 cancelled 命名一致。
    async def set_cancelled(self, run_id: str) -> AgentRun | None:
        run = await self.session.get(AgentRun, run_id)
        if run is None:
            return None

        run.agent_status = "cancelled"
        run.status = "cancelled"
        run.finished_at = datetime.now(UTC)
        run.error = None
        await self.session.flush()
        return run
