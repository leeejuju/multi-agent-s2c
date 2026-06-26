from __future__ import annotations

from datetime import UTC, datetime
from threading import Lock

from src.configs.config import config as sys_config

from .provision_client import SandboxProvisionClient
from .sandbox import S2CSandbox


def _build_cache_key(uid, thread_id):
    return f"{uid}:{thread_id}"

class SandboxState:
    pass


class SandboxProviderService:
    """Sandbox的Service层服务，用于获取/创建Sandboxs实例，检测容器状态"""
    
    def __init__(self):
        self._client = SandboxProvisionClient()
        self._lock = Lock()
        self._buckets = ""
        self.sandbox_url = sys_config.sandbox_provisioner_url if sys_config.sandbox_provisioner_url else RuntimeError("sandbox_url缺失")
        
        
    
    def acquire(self, uid, thread_id, **kwargs):
        pass
    
    def delete(self):
        pass
        

