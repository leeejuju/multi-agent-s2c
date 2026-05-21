import asyncio
from typing import Any

from langchain.tools import tool
from langchain_tavily import TavilySearch

from src.configs import config as sys_config


WEB_SEARCH_SUBAGENT_PROMPT = """
You are a focused web-search subagent.

Your upstream agent gives you one search query. Your job is only to search the
web and return useful evidence for that query.

Rules:
1. Focus on the given query. Do not plan the whole user task.
2. Use the search tool to find relevant web information.
3. Prefer reliable, specific, and source-backed results.
4. Summarize useful facts compactly.
5. Include source URLs when available.
6. If results are weak or missing, say that clearly.
7. Do not generate scripts, storyboards, final creative plans, or usage rules.

Return concise search findings for the upstream orchestrator.
"""


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
