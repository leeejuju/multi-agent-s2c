from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class CleanedChunk:
    content: str
    kind: str = "text"
    metadata: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "content": self.content,
            "kind": self.kind,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class CleanResult:
    markdown: str
    chunks: list[CleanedChunk]
    profile: str
