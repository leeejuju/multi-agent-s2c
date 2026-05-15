from __future__ import annotations

from typing import Any

from langchain.tools import tool


@tool
async def search_references(
    query: str,
    scopes: list[str] | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """Search web, project history, materials, knowledge, and local files for references."""

    from src.agents.searchagent.orchestrator import search_references_data

    result = await search_references_data(query, scopes=scopes, limit=limit)
    return result.model_dump(mode="json")
