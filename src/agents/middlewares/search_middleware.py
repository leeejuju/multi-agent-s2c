# import json
# from typing import Annotated, Any, NotRequired

# from langchain.agents.middleware import AgentMiddleware, AgentState, Runtime, ToolCallRequest
# from langchain_core.messages import AIMessage, ToolMessage
# from langgraph.types import Command

# SEARCH_TOOL_NAMES = {"knowledge_search", "web_search_one", "web_search_parallel"}


# def merge_tool_activities(
#     left: dict[str, dict[str, Any]] | None,
#     right: dict[str, dict[str, Any]] | None,
# ) -> dict[str, dict[str, Any]]:
#     return {**(left or {}), **(right or {})}


# class SearchToolState(AgentState):
#     tool_activities: NotRequired[
#         Annotated[dict[str, dict[str, Any]], merge_tool_activities]
#     ]


# class SearchToolMiddleware(AgentMiddleware[SearchToolState, Any, Any]):
#     """拦截 Search 功能，然后去实现高并发的异步搜索，并将搜索状态和结果通过 AgentState 传递下去，供前端展示"""

#     state_schema = SearchToolState

#     async def aafter_model(
#         self,
#         state: SearchToolState,
#         runtime: Runtime[Any],
#     ) -> dict[str, Any] | None:
#         messages = state.get("messages") or []
#         if not messages:
#             return None

#         latest_message = messages[-1]
#         if not isinstance(latest_message, AIMessage):
#             return None

#         activities: dict[str, dict[str, Any]] = {}
#         for tool_call in latest_message.tool_calls or []:
#             tool_name = tool_call.get("name")
#             if not isinstance(tool_name, str) or tool_name not in SEARCH_TOOL_NAMES:
#                 continue

#             tool_call_id = tool_call.get("id")
#             if not tool_call_id:
#                 continue

#             args = tool_call.get("args") or {}
#             activities[tool_call_id] = _build_activity(
#                 tool_call_id=tool_call_id,
#                 tool_name=tool_name,
#                 args=args,
#                 status="searching",
#             )

#         if not activities:
#             return None
#         return {"tool_activities": activities}



# def _build_activity(
#     *,
#     tool_call_id: str,
#     tool_name: str,
#     args: dict[str, Any],
#     status: str,
#     result_count: int | None = None,
#     error: str | None = None,
# ) -> dict[str, Any]:
#     activity: dict[str, Any] = {
#         "tool_call_id": tool_call_id,
#         "tool_name": tool_name,
#         "status": status,
#         "source": "knowledge" if tool_name == "knowledge_search" else "web",
#     }
#     query = args.get("query")
#     queries = args.get("queries")
#     if isinstance(query, str):
#         activity["query"] = query
#     elif isinstance(queries, list):
#         activity["query"] = "; ".join(str(item) for item in queries if item)
#         activity["search_scopes"] = ["web"] * len(queries)
#     if result_count is not None:
#         activity["result_count"] = result_count
#     if error:
#         activity["error"] = error
#     return activity


# def _build_tool_message(
#     *,
#     tool_call_id: str,
#     tool_name: str,
#     args: dict[str, Any],
#     status: str,
#     output: Any,
#     error: str | None,
# ) -> ToolMessage:
#     content = json.dumps(
#         {
#             "status": status,
#             "tool_call_id": tool_call_id,
#             "tool_name": tool_name,
#             "input": args,
#             "output": output,
#             "error": error,
#         },
#         ensure_ascii=False,
#         default=str,
#     )
#     return ToolMessage(
#         content=content,
#         tool_call_id=tool_call_id,
#         name=tool_name,
#         status="error" if status == "failed" else "success",
#     )


# def _guess_result_count(output: Any) -> int | None:
#     if isinstance(output, list):
#         return len(output)
#     if isinstance(output, dict):
#         for key in ("results", "items"):
#             value = output.get(key)
#             if isinstance(value, list):
#                 return len(value)
#     return None
