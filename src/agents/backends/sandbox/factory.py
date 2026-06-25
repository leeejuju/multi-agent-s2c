from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any

from src.configs import config

from .sandbox import S2CSandbox, create_s2c_sandbox

SandboxCreateKey = tuple[str, str, str]
SandboxState = dict[str, object]


class SandboxFactory:
    """Mock sandbox lifecycle manager."""

    def __init__(self, sandbox_provisioner_url: str | None = None) -> None:
        self.sandbox_provisioner_url = (
            sandbox_provisioner_url
            if sandbox_provisioner_url is not None
            else config.sandbox_provisioner_url
        )
        self._lock = Lock()
        self._by_create_key: dict[SandboxCreateKey, S2CSandbox] = {}
        self._by_sandbox_id: dict[str, S2CSandbox] = {}
        self._states: dict[str, SandboxState] = {}

    def create(
        self,
        sandbox_id: str,
        thread_id: str,
        user_id: str,
        root: str | Path | None = None,
        **metadata: Any,
    ) -> S2CSandbox:
        sandbox_id = str(sandbox_id).strip()
        thread_id = str(thread_id).strip()
        user_id = str(user_id).strip()
        create_key = (thread_id, user_id, sandbox_id)

        with self._lock:
            sandbox = self._by_create_key.get(create_key)
            if sandbox is not None:
                self._touch_locked(sandbox_id)
                return sandbox

            sandbox = self._by_sandbox_id.get(sandbox_id)
            if sandbox is not None:
                self._by_create_key[create_key] = sandbox
                self._touch_locked(sandbox_id)
                return sandbox

            sandbox = create_s2c_sandbox(root)
            now = self._now()
            self._by_create_key[create_key] = sandbox
            self._by_sandbox_id[sandbox_id] = sandbox
            self._states[sandbox_id] = {
                "exists": True,
                "status": "running",
                "sandbox_id": sandbox_id,
                "thread_id": thread_id,
                "user_id": user_id,
                "backend_sandbox_id": sandbox.id,
                "sandbox_provisioner_url": self.sandbox_provisioner_url,
                "created_at": now,
                "updated_at": now,
                "last_touched_at": now,
                "metadata": dict(metadata),
            }
            return sandbox

    def state(self, sandbox_id: str) -> SandboxState:
        sandbox_id = str(sandbox_id).strip()
        with self._lock:
            state = self._states.get(sandbox_id)
            if state is None:
                return {
                    "exists": False,
                    "status": "missing",
                    "sandbox_id": sandbox_id,
                    "sandbox_provisioner_url": self.sandbox_provisioner_url,
                }
            return dict(state)

    def discover(
        self,
        *,
        user_id: str | None = None,
        thread_id: str | None = None,
    ) -> list[SandboxState]:
        with self._lock:
            states = []
            for state in self._states.values():
                if not state.get("exists"):
                    continue
                if user_id is not None and state.get("user_id") != str(user_id).strip():
                    continue
                if thread_id is not None and state.get("thread_id") != str(thread_id).strip():
                    continue
                states.append(dict(state))
            return states

    def touch(self, sandbox_id: str) -> SandboxState:
        sandbox_id = str(sandbox_id).strip()
        with self._lock:
            if sandbox_id not in self._states:
                return {
                    "exists": False,
                    "status": "missing",
                    "sandbox_id": sandbox_id,
                    "sandbox_provisioner_url": self.sandbox_provisioner_url,
                }
            self._touch_locked(sandbox_id)
            return dict(self._states[sandbox_id])

    def delete(self, sandbox_id: str) -> SandboxState:
        sandbox_id = str(sandbox_id).strip()
        with self._lock:
            self._by_sandbox_id.pop(sandbox_id, None)
            for create_key in [
                create_key
                for create_key in self._by_create_key
                if create_key[2] == sandbox_id
            ]:
                self._by_create_key.pop(create_key, None)

            now = self._now()
            state = self._states.get(sandbox_id)
            if state is None:
                return {
                    "exists": False,
                    "status": "missing",
                    "sandbox_id": sandbox_id,
                    "sandbox_provisioner_url": self.sandbox_provisioner_url,
                    "updated_at": now,
                }

            state["exists"] = False
            state["status"] = "deleted"
            state["updated_at"] = now
            state["deleted_at"] = now
            return dict(state)

    def _touch_locked(self, sandbox_id: str) -> None:
        state = self._states.get(sandbox_id)
        if state is None:
            return
        now = self._now()
        state["updated_at"] = now
        state["last_touched_at"] = now

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()
