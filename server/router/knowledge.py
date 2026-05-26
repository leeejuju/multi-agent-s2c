from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from server.service.knowledge_service import (
    get_graph_knowledge_status,
    insert_graph_knowledge_documents,
    query_graph_knowledge,
)
from server.utils.auth import AuthenticatedUser
from src.knowledge import KnowledgeDocument

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

QueryMode = Literal["local", "global", "hybrid", "naive", "mix", "bypass"]


class KnowledgeDocumentPayload(BaseModel):
    id: str
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeInsertRequest(BaseModel):
    documents: list[KnowledgeDocumentPayload] = Field(min_length=1)


class KnowledgeQueryRequest(BaseModel):
    query: str = Field(min_length=1)
    mode: QueryMode = "mix"
    top_k: int = Field(default=10, ge=1, le=100)
    chunk_top_k: int = Field(default=10, ge=1, le=100)
    only_need_context: bool = False
    include_references: bool = True
    response_type: str = "Multiple Paragraphs"


@router.get("/graph/status", response_model=dict[str, Any])
async def graph_knowledge_status(_current_user: AuthenticatedUser):
    return await get_graph_knowledge_status()


@router.post("/graph/documents", response_model=dict[str, Any])
async def insert_graph_documents(
    payload: KnowledgeInsertRequest,
    _current_user: AuthenticatedUser,
):
    documents = [
        KnowledgeDocument(
            id=document.id,
            content=document.content,
            metadata=document.metadata,
        )
        for document in payload.documents
    ]
    return await insert_graph_knowledge_documents(documents)


@router.post("/graph/query", response_model=dict[str, Any])
async def query_graph(
    payload: KnowledgeQueryRequest,
    _current_user: AuthenticatedUser,
):
    return await query_graph_knowledge(
        payload.query,
        mode=payload.mode,
        top_k=payload.top_k,
        chunk_top_k=payload.chunk_top_k,
        only_need_context=payload.only_need_context,
        include_references=payload.include_references,
        response_type=payload.response_type,
    )
