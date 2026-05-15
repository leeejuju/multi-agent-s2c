from langchain.agents import create_agent
from langchain.tools import tool
from langchain_tavily import TavilySearch

from src.agents.common import load_model
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


search_agent = create_agent(
    model=load_model(sys_config.flash_model),
    tools=[TavilySearch()],
    system_prompt=WEB_SEARCH_SUBAGENT_PROMPT,
)


@tool(description="Focused web search tool.")
def web_search(query: str) -> str:
    search_result = search_agent.ainvoke({"messages": [("user", query)]})
    return search_result["messages"][-1].content
