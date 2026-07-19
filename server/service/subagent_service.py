from collections.abc import Awaitable, Callable, Mapping
from datetime import datetime
from typing import Any, TypedDict
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from server.service.agent_run_service import enqueue_agent_run
from src.database.models import AgentRun, Conversation, Message
from src.database.repositories import AgentRunRepository, ConversationRepository
from src.database.session import session_context


class SubAgentMessageRecord(TypedDict):
    id: int
    conversation_id: int
    agent_run_id: str
    role: str
    content: str
    status: str
    request_id: str | None


class SubAgentRunRecord(TypedDict):
    run_id: str
    thread_id: str
    conversation_id: int
    parent_conversation_id: int
    parent_run_id: str
    trigger_message_id: int
    request_id: str
    agent_id: str
    status: str
    stream_url: str
    message: SubAgentMessageRecord


class SubAgentStatusRecord(TypedDict):
    run_id: str
    thread_id: str
    conversation_id: int
    parent_run_id: str
    agent_id: str
    status: str
    terminal: bool
    error: str | None
    created_at: str | None
    started_at: str | None
    finished_at: str | None
    updated_at: str | None


SUBAGENT_TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})


class SubAgentPersistenceError(RuntimeError):
    """子智能体创建记录提交后无法从数据库完整读回。"""


def _conversation_title(title: str | None, prompt: str, agent_id: str) -> str:
    if title and title.strip():
        return title.strip()[:255]
    first_line = prompt.splitlines()[0].strip()[:80]
    return first_line or f"{agent_id} 子任务"


def _datetime_text(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _build_status_record(run: AgentRun) -> SubAgentStatusRecord:
    status = str(run.agent_status)
    return {
        "run_id": str(run.id),
        "thread_id": str(run.thread_id),
        "conversation_id": int(run.conversation_id),
        "parent_run_id": str(run.parent_run_id),
        "agent_id": str(run.agent_id),
        "status": status,
        "terminal": status in SUBAGENT_TERMINAL_STATUSES,
        "error": str(run.error) if run.error is not None else None,
        "created_at": _datetime_text(run.created_at),
        "started_at": _datetime_text(run.started_at),
        "finished_at": _datetime_text(run.finished_at),
        "updated_at": _datetime_text(run.updated_at),
    }


def _build_record(
    *,
    conversation: Conversation,
    message: Message,
    run: AgentRun,
) -> SubAgentRunRecord:
    return {
        "run_id": str(run.id),
        "thread_id": str(conversation.thread_id),
        "conversation_id": int(conversation.id),
        "parent_conversation_id": int(conversation.parent_conversation_id),
        "parent_run_id": str(run.parent_run_id),
        "trigger_message_id": int(message.id),
        "request_id": str(run.request_id),
        "agent_id": str(run.agent_id),
        "status": str(run.agent_status),
        "stream_url": (
            f"/api/agent/runs/{run.id}/events?thread_id={conversation.thread_id}"
        ),
        "message": {
            "id": int(message.id),
            "conversation_id": int(message.conversation_id),
            "agent_run_id": str(message.agent_run_id),
            "role": str(message.role),
            "content": str(message.content),
            "status": str(message.status),
            "request_id": (str(message.request_id) if message.request_id is not None else None),
        },
    }


async def _confirm_persisted_records(
    *,
    conversation_repository: ConversationRepository,
    run_repository: AgentRunRepository,
    conversation_id: int,
    message_id: int,
    run_id: str,
    parent_conversation_id: int,
    parent_run_id: str,
) -> tuple[Conversation, Message, AgentRun]:
    conversation = await conversation_repository.get_by_id(conversation_id)
    message = await conversation_repository.get_message_by_id(message_id)
    run = await run_repository.get_by_id(run_id)

    if (
        conversation is None
        or message is None
        or run is None
        or conversation.parent_conversation_id != parent_conversation_id
        or message.conversation_id != conversation.id
        or message.agent_run_id != run.id
        or run.conversation_id != conversation.id
        or run.trigger_message_id != message.id
        or run.parent_run_id != parent_run_id
        or str(run.run_type) != "subagent"
    ):
        raise SubAgentPersistenceError(f"子智能体运行记录落库后校验失败：run_id={run_id}")

    return conversation, message, run


class SubAgentRunService:
    """创建子智能体运行记录，确认落库后复用统一入队方法。"""

    def __init__(
        self,
        *,
        enqueue_run: Callable[[str], Awaitable[None]] = enqueue_agent_run,
    ) -> None:
        self._enqueue_run = enqueue_run

    async def create_record(
        self,
        *,
        parent_run_id: str,
        agent_id: str,
        prompt: str,
        title: str | None = None,
        request_id: str | None = None,
        conversation_metadata: Mapping[str, Any] | None = None,
    ) -> SubAgentRunRecord:
        """落库并确认子会话、触发消息和运行记录，入队后立即返回。"""

        async with session_context() as db:
            record = await self._persist_record(
                db,
                parent_run_id=parent_run_id,
                agent_id=agent_id,
                prompt=prompt,
                title=title,
                request_id=request_id,
                conversation_metadata=conversation_metadata,
            )

        await self._enqueue_run(record["run_id"])
        return record

    async def get_status(
        self,
        *,
        parent_run_id: str,
        run_id: str,
    ) -> SubAgentStatusRecord:
        """查询属于当前父运行的子智能体运行状态。"""

        async with session_context() as db:
            run = await AgentRunRepository(db).get_child_run_for_parent(
                run_id=run_id,
                parent_run_id=parent_run_id,
            )

        if run is None:
            raise ValueError(f"子智能体运行不存在或不属于当前父运行：{run_id}")
        return _build_status_record(run)

    async def _persist_record(
        self,
        db: AsyncSession,
        *,
        parent_run_id: str,
        agent_id: str,
        prompt: str,
        title: str | None,
        request_id: str | None,
        conversation_metadata: Mapping[str, Any] | None,
    ) -> SubAgentRunRecord:
        conversation_repository = ConversationRepository(db)
        run_repository = AgentRunRepository(db)

        try:
            parent_run = await run_repository.get_by_id(parent_run_id)
            if parent_run is None:
                raise ValueError(f"父运行不存在：{parent_run_id}")

            parent_conversation = await conversation_repository.get_by_id(
                int(parent_run.conversation_id)  # ty:ignore[invalid-argument-type]
            )
            if parent_conversation is None:
                raise ValueError(f"父会话不存在：{parent_run.conversation_id}")
            if str(parent_conversation.uid) != str(parent_run.uid):
                raise ValueError("父运行与父会话的用户归属不一致")

            child_thread_id = str(uuid4())
            child_run_id = str(uuid4())
            child_request_id = request_id or str(uuid4())

            child_conversation = await conversation_repository.create_conversation(
                uid=str(parent_run.uid),
                thread_id=child_thread_id,
                agent_id=agent_id,
                parent_conversation_id=int(parent_conversation.id),
                title=_conversation_title(title, prompt, agent_id),
                conversation_metadata=dict(conversation_metadata or {}),
            )
            trigger_message = await conversation_repository.create_message(
                conversation_id=int(child_conversation.id),
                role="user",
                content=prompt,
                request_id=child_request_id,
            )
            await run_repository.create_agent_run(
                run_id=child_run_id,
                thread_id=child_thread_id,
                conversation_id=int(child_conversation.id),
                uid=str(parent_run.uid),
                agent_id=agent_id,
                request_id=child_request_id,
                trigger_message_id=int(trigger_message.id),
                run_type="subagent",
                parent_run_id=parent_run_id,
            )
            linked_message = await conversation_repository.link_message_to_run(
                message_id=int(trigger_message.id),
                run_id=child_run_id,
            )
            if linked_message is None:
                raise RuntimeError("子智能体触发消息与运行记录关联失败")

            await db.commit()
        except Exception:
            await db.rollback()
            raise

        try:
            persisted_conversation, persisted_message, persisted_run = await _confirm_persisted_records(
                conversation_repository=conversation_repository,
                run_repository=run_repository,
                conversation_id=int(child_conversation.id),
                message_id=int(trigger_message.id),
                run_id=child_run_id,
                parent_conversation_id=int(parent_conversation.id),
                parent_run_id=parent_run_id,
            )
        except Exception:
            await db.rollback()
            raise

        return _build_record(
            conversation=persisted_conversation,
            message=persisted_message,
            run=persisted_run,
        )


subagent_run_service = SubAgentRunService()
