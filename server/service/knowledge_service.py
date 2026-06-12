from typing import Any

from src.knowledge import GraphKnowledgeFactory, KnowledgeDocument


async def get_graph_knowledge_status() -> dict[str, Any]:
    provider = GraphKnowledgeFactory.create()
    return {
        "provider": provider.provider_name,
        "ready": True,
    }


async def insert_graph_knowledge_documents(
    documents: list[KnowledgeDocument],
) -> dict[str, Any]:
    provider = GraphKnowledgeFactory.create()
    result = await provider.insert_documents(documents)
    return {
        "provider": provider.provider_name,
        "inserted_count": len(documents),
        "result": result,
    }


async def query_graph_knowledge(
    query: str,
    **kwargs: Any,
) -> dict[str, Any]:
    provider = GraphKnowledgeFactory.create()
    result = await provider.query(query, **kwargs)
    return {
        "provider": provider.provider_name,
        "query": query,
        "result": result,
    }
