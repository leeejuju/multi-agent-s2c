from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from server.service.knowledge_service import (
    delete_knowledge_records,
    get_knowledge_status,
    search_knowledge,
    upsert_knowledge_records,
)
from server.utils.auth import AuthenticatedUser
from src.knowledge import KnowledgeFactory, KnowledgeRecord, KnowledgeSearch

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeRecordPayload(BaseModel):
    id: str
    content: str | None = None
    vector: list[float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeUpsertRequest(BaseModel):
    records: list[KnowledgeRecordPayload] = Field(min_length=1)
    options: dict[str, Any] = Field(default_factory=dict)


class KnowledgeSearchRequest(BaseModel):
    query: str | None = None
    vector: list[float] | None = None
    limit: int = Field(default=10, ge=1, le=100)
    options: dict[str, Any] = Field(default_factory=dict)


class KnowledgeDeleteRequest(BaseModel):
    ids: list[str] = Field(min_length=1)
    options: dict[str, Any] = Field(default_factory=dict)


@router.get("/types", response_model=dict[str, Any])
async def list_knowledge_types(_current_user: AuthenticatedUser):
    return {
        "types": [
            {
                "type": knowledge_type,
                "database": KnowledgeFactory.database_name(knowledge_type),
            }
            for knowledge_type in KnowledgeFactory.supported_types()
        ]
    }


@router.get("/{knowledge_type}/status", response_model=dict[str, Any])
async def knowledge_status(
    knowledge_type: str,
    _current_user: AuthenticatedUser,
):
    return await get_knowledge_status(knowledge_type)


@router.post("/{knowledge_type}/records", response_model=dict[str, Any])
async def upsert_knowledge_records_route(
    knowledge_type: str,
    payload: KnowledgeUpsertRequest,
    _current_user: AuthenticatedUser,
):
    records = [
        KnowledgeRecord(
            id=record.id,
            content=record.content,
            vector=record.vector,
            metadata=record.metadata,
        )
        for record in payload.records
    ]
    return await upsert_knowledge_records(
        knowledge_type,
        records,
        **payload.options,
    )


@router.post("/{knowledge_type}/search", response_model=dict[str, Any])
async def search_records(
    knowledge_type: str,
    payload: KnowledgeSearchRequest,
    _current_user: AuthenticatedUser,
):
    return await search_knowledge(
        knowledge_type,
        KnowledgeSearch(
            query=payload.query,
            vector=payload.vector,
            limit=payload.limit,
            options=payload.options,
        ),
    )


@router.delete("/{knowledge_type}/records", response_model=dict[str, Any])
async def delete_knowledge_records_route(
    knowledge_type: str,
    payload: KnowledgeDeleteRequest,
    _current_user: AuthenticatedUser,
):
    return await delete_knowledge_records(
        knowledge_type,
        payload.ids,
        **payload.options,
    )
