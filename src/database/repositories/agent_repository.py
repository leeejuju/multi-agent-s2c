from typing import Literal

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

    async def get_slug(self, agent_slug: str) -> Agent | None:
        result = await self.session.execute(
            select(Agent).where(Agent.slug == agent_slug)
        )
        return result.scalar_one_or_none()

    async def ensure_agent_exists(
        self,
        *,
        slug: str,
        backend_id: str,
        name: str,
        description: str,
        role: str = "orchestrator",
        internal_only: bool = False,
    ) -> Agent:
        # FIXME: 启动时幂等写入代码中已注册的顶层 Agent，避免首次创建会话时查不到。
        agent = await self.get_slug(slug)
        if agent is None:
            agent = Agent(
                slug=slug,
                backend_id=backend_id,
                name=name,
                role=role,
                description=description,
                agent_config={},
                internal_only=internal_only,
                enabled=True,
            )
            self.session.add(agent)
        else:
            # FIXME: 代码拥有这些注册信息，启动时同步更新，但保留数据库中的 agent_config。
            agent.backend_id = backend_id
            agent.name = name
            agent.role = role
            agent.description = description
            agent.internal_only = internal_only

        await self.session.flush()
        return agent

    async def get_agent_by_slug(
        self,
        agent_slug: str,
        agent_type: Literal["father", "son"] = "father",
    ) -> Agent | None:
        """根据 agent 指定键值返回

        Args:
            agent_slug (str): agent内部标志
            agent_type : agent 类型

        Returns:
            Agent | None: _description_
        """

        agent = await self.get_slug(agent_slug=agent_slug)

        if not agent:
            return None

        if agent_type == "father":
            return agent

    async def list_agent_items(
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

    # async def create(
    #     self,
    #     *,
    #     slug: str,
    #     backend_id: str,
    #     name: str,
    #     role: str = "orchestrator",
    #     description: str = "",
    #     agent_config: dict[str, Any] | None = None,
    #     internal_only: bool = True,
    #     enabled: bool = True,
    # ) -> Agent:
    #     agent = Agent(
    #         slug=slug,
    #         backend_id=backend_id,
    #         name=name,
    #         role=role,
    #         description=description,
    #         agent_config=agent_config or {},
    #         internal_only=internal_only,
    #         enabled=enabled,
    #     )
    #     self.session.add(agent)
    #     await self.session.flush()
    #     return agent

    # async def set_enabled(self, agent: Agent, enabled: bool) -> Agent:
    #     agent.enabled = enabled
    #     await self.session.flush()
    #     return agent

    # async def delete(self, agent: Agent) -> None:
    #     await self.session.delete(agent)
    #     await self.session.flush()
