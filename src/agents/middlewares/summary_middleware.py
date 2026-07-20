"""Conversation summarization middleware."""

from langchain.agents.middleware import SummarizationMiddleware
from langchain.agents.middleware.summarization import ContextSize
from langchain.chat_models import BaseChatModel


# def create_summary_middleware(
#     model: str | BaseChatModel,
#     *,
#     trigger: ContextSize | list[ContextSize] = ("messages", 12),
#     keep: ContextSize = ("messages", 6),
# ) -> SummarizationMiddleware:
#     """创建对话摘要 middleware。"""
#     return SummarizationMiddleware(
#         model=model,
#         trigger=trigger,
#         keep=keep,
#     )

