from typing import Any

from src.knowledge import KnowledgeFactory, KnowledgeRecord, KnowledgeSearch


def _knowledge_metadata(knowledge_type: str) -> dict[str, Any]:
    normalized_type = KnowledgeFactory.normalize_type(knowledge_type)
    return {
        "type": normalized_type,
        "database": KnowledgeFactory.database_name(normalized_type),
    }


async def get_knowledge_status(knowledge_type: str) -> dict[str, Any]:
    knowledge = KnowledgeFactory.create(knowledge_type)
    return {
        **_knowledge_metadata(knowledge_type),
        **await knowledge.status(),
    }


async def upsert_knowledge_records(
    knowledge_type: str,
    records: list[KnowledgeRecord],
    **options: Any,
) -> dict[str, Any]:
    knowledge = KnowledgeFactory.create(knowledge_type)
    result = await knowledge.upsert(records, **options)
    return {
        **_knowledge_metadata(knowledge_type),
        "upserted_count": len(records),
        "result": result,
    }


async def search_knowledge(
    knowledge_type: str,
    request: KnowledgeSearch,
) -> dict[str, Any]:
    knowledge = KnowledgeFactory.create(knowledge_type)
    result = await knowledge.search(request)
    return {
        **_knowledge_metadata(knowledge_type),
        "result": result,
    }


async def delete_knowledge_records(
    knowledge_type: str,
    ids: list[str],
    **options: Any,
) -> dict[str, Any]:
    knowledge = KnowledgeFactory.create(knowledge_type)
    result = await knowledge.delete(ids, **options)
    return {
        **_knowledge_metadata(knowledge_type),
        "deleted_count": len(ids),
        "result": result,
    }
