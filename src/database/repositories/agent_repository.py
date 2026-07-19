from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Agent, AgentRun, Conversation

_LEGACY_AGENT_SLUGS = {"DesignAgent": "LeaderAgent"}


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
        """补充缺失的固定 Agent 注册，不覆盖数据库中的已有记录。"""

        agent = await self.get_slug(slug)
        if agent is not None:
            return agent

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
        await self.session.flush()
        return agent

    async def rename_agent_slug(self, *, old_slug: str, new_slug: str) -> None:
        """幂等迁移 Agent 注册及引用它的会话和 Run 标识。"""

        legacy_agent = await self.get_slug(old_slug)
        if legacy_agent is None:
            return

        current_agent = await self.get_slug(new_slug)
        await self.session.execute(
            update(Conversation)
            .where(Conversation.agent_id == old_slug)
            .values(agent_id=new_slug)
        )
        await self.session.execute(
            update(AgentRun)
            .where(AgentRun.agent_id == old_slug)
            .values(agent_id=new_slug)
        )

        if current_agent is None:
            legacy_agent.slug = new_slug
        else:
            await self.session.delete(legacy_agent)

        await self.session.flush()

    async def get_agent_by_slug(
        self,
        agent_slug: str,
        run_type: str = "chat",
    ) -> Agent | None:
        """根据 agent 指定键值返回

        Args:
            agent_slug (str): agent内部标志
            run_type: Agent Run 类型

        Returns:
            Agent | None: _description_
        """

        agent = await self.get_slug(agent_slug=agent_slug)
        if agent is None and agent_slug in _LEGACY_AGENT_SLUGS:
            agent = await self.get_slug(_LEGACY_AGENT_SLUGS[agent_slug])

        if not agent:
            return None

        expected_role = {
            "chat": "orchestrator",
            "subagent": "subagent",
        }.get(run_type)
        if expected_role is None:
            return None
        if not agent.enabled or agent.role != expected_role:
            return None
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
