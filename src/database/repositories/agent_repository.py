from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Agent


class AgentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, agent_id: str | int) -> Agent | None:
        try:
            return await self.session.get(Agent, int(agent_id))
        except (TypeError, ValueError):
            return None

    async def get_by_slug(self, slug: str) -> Agent | None:
        """获取当前agent是否存在"""
        result = await self.session.execute(select(Agent).where(Agent.slug == slug))
        return result

    async def list_items(
        self,
        *,
        enabled_only: bool = True,
        include_internal: bool = True,
    ) -> list[Agent]:
        statement = select(Agent)
        if enabled_only:
            statement = statement.where(Agent.enabled.is_(True))
        if not include_internal:
            statement = statement.where(Agent.internal_only.is_(False))
        result = await self.session.execute(statement.order_by(Agent.id.asc()))
        return list(result.scalars().all())

    async def create(
        self,
        *,
        slug: str,
        backend_id: str,
        name: str,
        role: str = "orchestrator",
        description: str = "",
        agent_config: dict[str, Any] | None = None,
        internal_only: bool = True,
        enabled: bool = True,
    ) -> Agent:
        agent = Agent(
            slug=slug,
            backend_id=backend_id,
            name=name,
            role=role,
            description=description,
            agent_config=agent_config or {},
            internal_only=internal_only,
            enabled=enabled,
        )
        self.session.add(agent)
        await self.session.flush()
        return agent

    async def set_enabled(self, agent: Agent, enabled: bool) -> Agent:
        agent.enabled = enabled
        await self.session.flush()
        return agent

    async def delete(self, agent: Agent) -> None:
        await self.session.delete(agent)
        await self.session.flush()

