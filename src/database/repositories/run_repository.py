from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AgentRun, Message

ACTIVE_RUN_STATUSES = ("queued", "running", "canceling")


class RunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_run(
        self,
        *,
        conversation_id: str,
        user_id: str,
        agent_id: str,
        input_text: str,
        attachments: list[dict[str, Any]],
        request_config: dict[str, Any],
    ) -> AgentRun:
        run = AgentRun(
            conversation_id=int(conversation_id),
            user_id=int(user_id),
            agent_id=agent_id,
            input_text=input_text,
            attachments={"items": attachments},
            request_config=request_config,
            status="queued",
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def get_message_for_run(self, run_id: str, role: str) -> Message | None:
        result = await self.session.execute(
            select(Message)
            .where(
                Message.agent_run_id == int(run_id),
                Message.role == role,
            )
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(self, run_id: str, user_id: str) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun).where(
                AgentRun.id == int(run_id),
                AgentRun.user_id == int(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, run_id: str) -> AgentRun | None:
        return await self.session.get(AgentRun, int(run_id))

    async def get_active_for_conversation(
        self,
        *,
        conversation_id: str,
        user_id: str,
    ) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun)
            .where(
                AgentRun.conversation_id == int(conversation_id),
                AgentRun.user_id == int(user_id),
                AgentRun.status.in_(ACTIVE_RUN_STATUSES),
            )
            .order_by(AgentRun.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def set_status(
        self,
        run: AgentRun,
        status: str,
        *,
        error: str | None = None,
    ) -> AgentRun:
        now = datetime.now(UTC)
        run.status = status
        if status == "running" and run.started_at is None:
            run.started_at = now
        if status in {"completed", "failed", "canceled"}:
            run.finished_at = now
        if error is not None:
            run.error = error
        await self.session.flush()
        return run

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
