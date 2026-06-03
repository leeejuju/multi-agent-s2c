from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class SandboxPolicy:
    read_roots: tuple[Path, ...] = field(default_factory=tuple)
    write_roots: tuple[Path, ...] = field(default_factory=tuple)
    allow_network: bool = False


class AgentSandbox:
    """Path policy helper for future agent backend tools."""

    def __init__(self, policy: SandboxPolicy) -> None:
        self.policy = SandboxPolicy(
            read_roots=tuple(root.resolve() for root in policy.read_roots),
            write_roots=tuple(root.resolve() for root in policy.write_roots),
            allow_network=policy.allow_network,
        )

    def can_read(self, path: str | Path) -> bool:
        return self._is_allowed(path, self.policy.read_roots)

    def can_write(self, path: str | Path) -> bool:
        return self._is_allowed(path, self.policy.write_roots)

    def require_read(self, path: str | Path) -> Path:
        resolved = Path(path).resolve()
        if not self.can_read(resolved):
            raise PermissionError(f"Read path is outside the agent sandbox: {resolved}")
        return resolved

    def require_write(self, path: str | Path) -> Path:
        resolved = Path(path).resolve()
        if not self.can_write(resolved):
            raise PermissionError(f"Write path is outside the agent sandbox: {resolved}")
        return resolved

    @staticmethod
    def _is_allowed(path: str | Path, roots: tuple[Path, ...]) -> bool:
        resolved = Path(path).resolve()
        return any(resolved == root or root in resolved.parents for root in roots)
