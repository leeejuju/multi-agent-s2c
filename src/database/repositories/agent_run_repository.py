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
        thread_id: int | str,
        uid: int | str,
        agent_id: str,
        request_id: str,
        agent_status: str = "queued",
        parent_run_id: str | None = None,
    ) -> AgentRun:
        run = AgentRun(
            id=run_id,
            thread_id=int(thread_id),
            uid=uid,
            agent_id=agent_id,
            request_id=request_id,
            agent_status=agent_status,
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

