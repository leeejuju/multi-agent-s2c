import asyncio
from typing import Any

from langchain.tools import tool
from langchain_tavily import TavilySearch

from src.configs import config as sys_config
from src.knowledge.factory import GraphKnowledgeFactory


def _build_tavily_tool(max_results: int = 5) -> TavilySearch:
    return TavilySearch(
        max_results=max_results,
        tavily_api_key=sys_config.tavily_api_key or None,
    )


@tool(description="Run one focused web search query.")
async def web_search_one(query: str) -> Any:
    search_tool = _build_tavily_tool(max_results=5)
    return await search_tool.ainvoke({"query": query})


@tool(description="Run multiple focused web search queries concurrently.")
async def web_search_parallel(queries: list[str]) -> list[dict[str, Any]]:
    tasks = [web_search_one.ainvoke({"query": query}) for query in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results = []
    for query, result in zip(queries, results, strict=False):
        if isinstance(result, Exception):
            valid_results.append(
                {
                    "query": query,
                    "error": str(result),
                    "results": [],
                }
            )
        else:
            valid_results.append(
                {
                    "query": query,
                    "result": result,
                }
            )

    return valid_results


@tool(description="Search the local graph knowledge base through LightRAG.")
async def knowledge_search(
    query: str,
    mode: str = "mix",
    limit: int = 5,
) -> dict[str, Any]:
    provider = GraphKnowledgeFactory.create()
    result = await provider.query(
        query,
        mode=mode,
        top_k=limit,
        chunk_top_k=limit,
        only_need_context=True,
        include_references=True,
    )
    return {
        "reference_context": {
            "project_history": [],
            "material_refs": [],
            "knowledge_refs": [
                {
                    "query": query,
                    "mode": mode,
                    "content": result,
                }
            ],
            "web_refs": [],
            "local_file_refs": [],
        },
        "recommended_usage": {
            "must_follow": [],
            "can_use": ["Use knowledge_refs as local project/reference context."],
            "avoid": [],
        },
        "search_notes": [],
    }
