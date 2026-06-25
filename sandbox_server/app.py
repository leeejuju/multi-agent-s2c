from __future__ import annotations

import logging
import os
import re
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from urllib import request

from dotenv import dotenv_values
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

SANDBOX_ENV_FILE = Path(__file__).parent / "sandbox.env"
SAFE_PATH_SEGMENT_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def normalize_env(env: dict | None) -> dict[str, str]:
    if not isinstance(env, dict):
        return {}
    return {str(key): "" if value is None else str(value) for key, value in env.items() if str(key)}


def merged_sandbox_env(user_env: dict[str, str]) -> dict[str, str]:
    return {**normalize_env(dotenv_values(SANDBOX_ENV_FILE)), **normalize_env(user_env)}


class CreateSandboxRequest(BaseModel):
    sandbox_id: str
    thread_id: str
    file_thread_id: str | None = None
    skills_thread_id: str | None = None
    uid: str
    env: dict[str, str] = Field(default_factory=dict)


class SandboxResponse(BaseModel):
    sandbox_id: str
    sandbox_url: str
    status: str | None = None


class DeleteSandboxResponse(BaseModel):
    ok: bool
    sandbox_id: str


class TouchSandboxResponse(BaseModel):
    ok: bool
    sandbox_id: str
    status: str | None = None


class ListSandboxesResponse(BaseModel):
    sandboxes: list[SandboxResponse]
    count: int


@dataclass(slots=True)
class SandboxRecord:
    sandbox_id: str
    sandbox_url: str
    status: str | None = None


class MemoryBackend:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: dict[str, SandboxRecord] = {}
        self._url_template = os.getenv("MEMORY_SANDBOX_URL_TEMPLATE", "http://agent-sandbox:8000")

    def create(self, sandbox_id: str, thread_id: str, uid: str, env: dict[str, str] | None = None, *, file_thread_id: str | None = None, skills_thread_id: str | None = None) -> SandboxRecord:
        _ = (thread_id, uid, env, file_thread_id, skills_thread_id)
        with self._lock:
            record = self._records.get(sandbox_id)
            if record is None:
                url = self._url_template.format(sandbox_id=sandbox_id) if "{sandbox_id}" in self._url_template else self._url_template
                record = SandboxRecord(sandbox_id=sandbox_id, sandbox_url=url, status="running")
                self._records[sandbox_id] = record
            return record

    def discover(self, sandbox_id: str) -> SandboxRecord | None:
        with self._lock:
            return self._records.get(sandbox_id)

    def list(self) -> list[SandboxRecord]:
        with self._lock:
            return list(self._records.values())

    def delete(self, sandbox_id: str) -> None:
        with self._lock:
            self._records.pop(sandbox_id, None)


def wait_for_sandbox_ready(sandbox_url: str, timeout_seconds: int) -> bool:
    deadline = time.time() + timeout_seconds
    opener = request.build_opener(request.ProxyHandler({}))
    while time.time() < deadline:
        try:
            with opener.open(f"{sandbox_url.rstrip('/')}/v1/sandbox", timeout=3) as response:
                if getattr(response, "status", 200) == 200:
                    return True
        except Exception:
            time.sleep(1)
    return False


class DockerBackend:
    def __init__(self) -> None:
        from docker.errors import DockerException

        import docker

        self._lock = threading.Lock()
        self._container_port = int(os.getenv("SANDBOX_CONTAINER_PORT", "8080"))
        self._sandbox_image = os.getenv("SANDBOX_IMAGE", "enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest")
        self._network = os.getenv("DOCKER_NETWORK") or None
        self._threads_host_path = os.getenv("DOCKER_THREADS_HOST_PATH")
        self._container_prefix = os.getenv("DOCKER_SANDBOX_PREFIX", "s2c-sandbox")
        self._sandbox_host = os.getenv("DOCKER_SANDBOX_HOST", "host.docker.internal")
        self._health_timeout_seconds = int(os.getenv("SANDBOX_HEALTH_TIMEOUT_SECONDS", "300"))
        try:
            self._client = docker.from_env()
            self._client.ping()
        except DockerException as exc:
            raise RuntimeError(f"docker backend unavailable: {exc}") from exc
        self._resolve_host_paths()
        self._threads_host_path = self._normalize_host_bind_path(self._threads_host_path)

    @staticmethod
    def _normalize_host_bind_path(path_value: str | None) -> str:
        value = str(path_value or "").strip()
        if not value:
            raise RuntimeError("DOCKER_THREADS_HOST_PATH is required for docker backend")
        normalized = value.replace("\\", "/")
        match = re.match(r"^([A-Za-z]):/(.+)$", normalized)
        if match:
            return f"/run/desktop/mnt/host/{match.group(1).lower()}/{match.group(2).lstrip('/')}"
        return normalized

    def _resolve_host_paths(self) -> None:
        if self._threads_host_path:
            return
        container_id = os.getenv("HOSTNAME", "").strip()
        if not container_id:
            raise RuntimeError("DOCKER_THREADS_HOST_PATH is required when HOSTNAME cannot identify the provisioner container")
        inspected = self._client.api.inspect_container(container_id)
        saves_source = next((m.get("Source") for m in inspected.get("Mounts") or [] if (m.get("Destination") or "").rstrip("/") == "/app/saves"), None)
        if not saves_source:
            raise RuntimeError("cannot infer DOCKER_THREADS_HOST_PATH: mount host saves directory at /app/saves")
        self._threads_host_path = str(Path(self._normalize_host_bind_path(saves_source)) / "threads")

    @staticmethod
    def _safe_segment(value: str | None, label: str) -> str:
        candidate = str(value or "").strip()
        if not candidate:
            raise ValueError(f"{label} is required")
        if not SAFE_PATH_SEGMENT_RE.fullmatch(candidate):
            raise ValueError(f"{label} must contain only letters, numbers, '-' or '_'")
        return candidate

    @staticmethod
    def _container_suffix(value: str) -> str:
        suffix = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in value.strip().lower())
        return suffix[:48] or "sandbox"

    def _container_name(self, sandbox_id: str) -> str:
        return f"{self._container_prefix}-{self._container_suffix(sandbox_id)}"

    def _inside_threads(self, *parts: str) -> Path:
        threads_root = Path(str(self._threads_host_path)).resolve()
        target = threads_root.joinpath(*parts).resolve()
        try:
            target.relative_to(threads_root)
        except ValueError as exc:
            raise ValueError("sandbox host path resolved outside threads root") from exc
        return target

    def _paths(self, uid: str, file_thread_id: str, skills_thread_id: str) -> dict[str, Path]:
        return {
            "/home/gem/user-data/workspace": self._inside_threads("shared", uid, "workspace"),
            "/home/gem/user-data/uploads": self._inside_threads(file_thread_id, "user-data", "uploads"),
            "/home/gem/user-data/outputs": self._inside_threads(file_thread_id, "user-data", "outputs"),
            "/home/gem/skills": self._inside_threads(skills_thread_id, "skills"),
        }

    def _expected_mounts_ok(self, container, uid: str, file_thread_id: str, skills_thread_id: str) -> bool:
        expected = {dest: str(path) for dest, path in self._paths(uid, file_thread_id, skills_thread_id).items()}
        actual = {str((m.get("Destination") or "").rstrip("/")): str((m.get("Source") or "").rstrip("/")) for m in container.attrs.get("Mounts") or []}
        return all(actual.get(dest) == source for dest, source in expected.items())

    def _get_container(self, sandbox_id: str):
        from docker.errors import NotFound

        try:
            return self._client.containers.get(self._container_name(sandbox_id))
        except NotFound:
            return None

    def _host_port_for(self, container) -> int | None:
        bindings = ((container.attrs.get("NetworkSettings") or {}).get("Ports") or {}).get(f"{self._container_port}/tcp")
        if not bindings:
            return None
        host_port = bindings[0].get("HostPort")
        return int(host_port) if host_port else None

    def _record(self, container, sandbox_id: str) -> SandboxRecord:
        host_port = self._host_port_for(container)
        state = (container.attrs.get("State") or {}).get("Status") or "unknown"
        return SandboxRecord(sandbox_id=sandbox_id, sandbox_url=f"http://{self._sandbox_host}:{host_port}" if host_port else "", status=state)

    @staticmethod
    def _ensure_writable(container) -> None:
        cmd = "sh -lc \"mkdir -p /home/gem/user-data/workspace /home/gem/user-data/uploads /home/gem/user-data/outputs && chmod -R a+rwx /home/gem/user-data\""
        result = container.exec_run(cmd, user="0:0")
        if result.exit_code != 0:
            output = result.output.decode("utf-8", errors="ignore") if isinstance(result.output, bytes) else str(result.output)
            raise RuntimeError(f"failed to ensure writable user-data mounts: {output}")

    def create(self, sandbox_id: str, thread_id: str, uid: str, env: dict[str, str] | None = None, *, file_thread_id: str | None = None, skills_thread_id: str | None = None) -> SandboxRecord:
        with self._lock:
            safe_thread_id = self._safe_segment(thread_id, "thread_id")
            safe_file_thread_id = self._safe_segment(file_thread_id or safe_thread_id, "file_thread_id")
            safe_skills_thread_id = self._safe_segment(skills_thread_id or safe_thread_id, "skills_thread_id")
            safe_uid = self._safe_segment(uid, "uid")
            existing = self._get_container(sandbox_id)
            if existing is not None:
                existing.reload()
                if self._expected_mounts_ok(existing, safe_uid, safe_file_thread_id, safe_skills_thread_id) and existing.status == "running":
                    self._ensure_writable(existing)
                    record = self._record(existing, sandbox_id)
                    if record.sandbox_url and wait_for_sandbox_ready(record.sandbox_url, self._health_timeout_seconds):
                        return record
                self.delete(sandbox_id)

            paths = self._paths(safe_uid, safe_file_thread_id, safe_skills_thread_id)
            for path in paths.values():
                path.mkdir(parents=True, exist_ok=True)
            run_kwargs = {
                "name": self._container_name(sandbox_id),
                "detach": True,
                "labels": {
                    "app": "s2c-sandbox",
                    "sandbox-id": sandbox_id,
                    "thread-id": safe_thread_id,
                    "file-thread-id": safe_file_thread_id,
                    "skills-thread-id": safe_skills_thread_id,
                    "uid": safe_uid,
                    "managed-by": "s2c-sandbox-provisioner",
                },
                "volumes": {
                    str(paths["/home/gem/user-data/workspace"]): {"bind": "/home/gem/user-data/workspace", "mode": "rw"},
                    str(paths["/home/gem/user-data/uploads"]): {"bind": "/home/gem/user-data/uploads", "mode": "rw"},
                    str(paths["/home/gem/user-data/outputs"]): {"bind": "/home/gem/user-data/outputs", "mode": "rw"},
                    str(paths["/home/gem/skills"]): {"bind": "/home/gem/skills", "mode": "ro"},
                },
                "ports": {f"{self._container_port}/tcp": None},
                "security_opt": ["seccomp=unconfined"],
                "tmpfs": {"/home/gem": "rw,exec,mode=777"},
            }
            if self._network:
                run_kwargs["network"] = self._network
            sandbox_env = merged_sandbox_env(env or {})
            if sandbox_env:
                run_kwargs["environment"] = sandbox_env

            container = self._client.containers.run(self._sandbox_image, **run_kwargs)
            container.reload()
            self._ensure_writable(container)
            record = self._record(container, sandbox_id)
            if not record.sandbox_url:
                raise RuntimeError(f"sandbox {sandbox_id} has no mapped host port")
            if not wait_for_sandbox_ready(record.sandbox_url, self._health_timeout_seconds):
                raise RuntimeError(f"sandbox {sandbox_id} is not ready at {record.sandbox_url}")
            return record

    def discover(self, sandbox_id: str) -> SandboxRecord | None:
        container = self._get_container(sandbox_id)
        if container is None:
            return None
        container.reload()
        labels = container.labels or {}
        thread_id = str(labels.get("thread-id") or "").strip()
        uid = str(labels.get("uid") or "").strip()
        if not thread_id or not uid:
            return None
        file_thread_id = str(labels.get("file-thread-id") or thread_id)
        skills_thread_id = str(labels.get("skills-thread-id") or thread_id)
        if not self._expected_mounts_ok(container, self._safe_segment(uid, "uid"), self._safe_segment(file_thread_id, "file_thread_id"), self._safe_segment(skills_thread_id, "skills_thread_id")):
            self.delete(sandbox_id)
            return None
        record = self._record(container, sandbox_id)
        if not record.sandbox_url or not wait_for_sandbox_ready(record.sandbox_url, 5):
            return None
        return record

    def list(self) -> list[SandboxRecord]:
        containers = self._client.containers.list(all=True, filters={"label": ["app=s2c-sandbox", "managed-by=s2c-sandbox-provisioner"]})
        records: list[SandboxRecord] = []
        for container in containers:
            sandbox_id = (container.labels or {}).get("sandbox-id")
            if sandbox_id:
                container.reload()
                records.append(self._record(container, sandbox_id))
        return records

    def delete(self, sandbox_id: str) -> None:
        container = self._get_container(sandbox_id)
        if container is None:
            return
        if container.status == "running":
            container.stop(timeout=10)
        container.remove(v=True, force=True)


class IdleReaper:
    def __init__(self, backend) -> None:
        self._backend = backend
        self._lock = threading.Lock()
        self._last_activity_at: dict[str, float] = {}
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        exec_timeout = int(os.getenv("SANDBOX_EXEC_TIMEOUT_SECONDS", "180"))
        self._idle_timeout_seconds = int(os.getenv("SANDBOX_IDLE_TIMEOUT_SECONDS", "600"))
        if 0 < self._idle_timeout_seconds <= exec_timeout:
            self._idle_timeout_seconds = exec_timeout + 30
        self._check_interval_seconds = max(1, int(os.getenv("SANDBOX_IDLE_CHECK_INTERVAL_SECONDS", "10")))

    def touch(self, sandbox_id: str) -> None:
        with self._lock:
            self._last_activity_at[sandbox_id] = time.time()

    def forget(self, sandbox_id: str) -> None:
        with self._lock:
            self._last_activity_at.pop(sandbox_id, None)

    def start(self) -> None:
        if self._idle_timeout_seconds <= 0:
            return
        now = time.time()
        with self._lock:
            for record in self._backend.list():
                self._last_activity_at.setdefault(record.sandbox_id, now)
        self._thread = threading.Thread(target=self._run, name="sandbox-idle-reaper", daemon=True)
        self._thread.start()

    def shutdown(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=3)

    def _run(self) -> None:
        while not self._stop_event.wait(self._check_interval_seconds):
            cutoff = time.time() - self._idle_timeout_seconds
            with self._lock:
                expired = [sandbox_id for sandbox_id, last_at in self._last_activity_at.items() if last_at <= cutoff]
            for sandbox_id in expired:
                try:
                    self._backend.delete(sandbox_id)
                    self.forget(sandbox_id)
                except Exception as exc:
                    logger.warning("failed to delete idle sandbox %s: %s", sandbox_id, exc)


def build_backend():
    backend = os.getenv("PROVISIONER_BACKEND", "memory").strip().lower()
    if backend == "docker":
        return DockerBackend(), "docker"
    # ponytail: current repo needs local memory and Docker; add k8s when deployment proves it.
    return MemoryBackend(), "memory"


backend_impl, backend_name = build_backend()
idle_reaper = IdleReaper(backend_impl)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    idle_reaper.start()
    try:
        yield
    finally:
        idle_reaper.shutdown()


app = FastAPI(title="S2C Sandbox Provisioner", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "backend": backend_name,
        "idle_timeout_seconds": idle_reaper._idle_timeout_seconds,  # noqa: SLF001
        "idle_check_interval_seconds": idle_reaper._check_interval_seconds,  # noqa: SLF001
        "tracked_sandboxes": len(idle_reaper._last_activity_at),  # noqa: SLF001
    }


@app.post("/api/sandboxes", response_model=SandboxResponse)
def create_sandbox(payload: CreateSandboxRequest):
    try:
        record = backend_impl.create(payload.sandbox_id, payload.thread_id, payload.uid, payload.env, file_thread_id=payload.file_thread_id, skills_thread_id=payload.skills_thread_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    idle_reaper.touch(record.sandbox_id)
    return SandboxResponse(sandbox_id=record.sandbox_id, sandbox_url=record.sandbox_url, status=record.status)


@app.get("/api/sandboxes/{sandbox_id}", response_model=SandboxResponse)
def get_sandbox(sandbox_id: str):
    try:
        record = backend_impl.discover(sandbox_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail="sandbox not found")
    idle_reaper.touch(record.sandbox_id)
    return SandboxResponse(sandbox_id=record.sandbox_id, sandbox_url=record.sandbox_url, status=record.status)


@app.post("/api/sandboxes/{sandbox_id}/touch", response_model=TouchSandboxResponse)
def touch_sandbox(sandbox_id: str):
    try:
        record = backend_impl.discover(sandbox_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail="sandbox not found")
    idle_reaper.touch(sandbox_id)
    return TouchSandboxResponse(ok=True, sandbox_id=sandbox_id, status=record.status)


@app.get("/api/sandboxes", response_model=ListSandboxesResponse)
def list_sandboxes():
    try:
        records = backend_impl.list()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    sandboxes = [SandboxResponse(sandbox_id=record.sandbox_id, sandbox_url=record.sandbox_url, status=record.status) for record in records]
    return ListSandboxesResponse(sandboxes=sandboxes, count=len(sandboxes))


@app.delete("/api/sandboxes/{sandbox_id}", response_model=DeleteSandboxResponse)
def delete_sandbox(sandbox_id: str):
    try:
        backend_impl.delete(sandbox_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    idle_reaper.forget(sandbox_id)
    return DeleteSandboxResponse(ok=True, sandbox_id=sandbox_id)


def _demo() -> None:
    backend = MemoryBackend()
    record = backend.create("demo", "thread_1", "user_1")
    assert record.sandbox_url == "http://agent-sandbox:8000"
    assert backend.discover("demo") == record
    backend.delete("demo")
    assert backend.discover("demo") is None


if __name__ == "__main__":
    _demo()
