from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AgentRun, RunEvent

ACTIVE_RUN_STATUSES = ("queued", "running", "canceling")


class RunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_run(
        self,
        *,
        conversation_id: str,
        user_id: str,
        user_message_id: str,
        assistant_message_id: str,
        agent_id: str,
        input_text: str,
        attachments: list[dict[str, Any]],
        request_config: dict[str, Any],
    ) -> AgentRun:
        run = AgentRun(
            id=uuid4(),
            conversation_id=UUID(conversation_id),
            user_id=UUID(user_id),
            user_message_id=UUID(user_message_id),
            assistant_message_id=UUID(assistant_message_id),
            agent_id=agent_id,
            input_text=input_text,
            attachments={"items": attachments},
            request_config=request_config,
            status="queued",
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def get_by_id_for_user(self, run_id: str, user_id: str) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun).where(
                AgentRun.id == UUID(run_id),
                AgentRun.user_id == UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, run_id: str) -> AgentRun | None:
        return await self.session.get(AgentRun, UUID(run_id))

    async def get_active_for_conversation(
        self,
        *,
        conversation_id: str,
        user_id: str,
    ) -> AgentRun | None:
        result = await self.session.execute(
            select(AgentRun)
            .where(
                AgentRun.conversation_id == UUID(conversation_id),
                AgentRun.user_id == UUID(user_id),
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

    async def add_event(
        self,
        *,
        run_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> RunEvent:
        sequence = await self.next_sequence(run_id)
        event = RunEvent(
            id=uuid4(),
            run_id=UUID(run_id),
            sequence=sequence,
            type=event_type,
            payload={**payload, "sequence": sequence},
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def next_sequence(self, run_id: str) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.max(RunEvent.sequence), 0)).where(
                RunEvent.run_id == UUID(run_id)
            )
        )
        return int(result.scalar_one()) + 1

    async def list_events_after(self, run_id: str, sequence: int = 0) -> list[RunEvent]:
        result = await self.session.execute(
            select(RunEvent)
            .where(
                RunEvent.run_id == UUID(run_id),
                RunEvent.sequence > sequence,
            )
            .order_by(RunEvent.sequence.asc())
        )
        return list(result.scalars().all())

    async def latest_sequence(self, run_id: str) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.max(RunEvent.sequence), 0)).where(
                RunEvent.run_id == UUID(run_id)
            )
        )
        return int(result.scalar_one())

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
