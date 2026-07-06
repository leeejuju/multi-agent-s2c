from dataclasses import dataclass, field

from src.agents import BaseContext


@dataclass(kw_only=True)
class SubAgentContext(BaseContext):
    
    parent_thread_id = field(default=None, metadata={"name": "父线程/会话ID", "configurable":False })
