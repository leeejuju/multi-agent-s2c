from fastapi import APIRouter

from .agent_router import agent_router
from .auth_router import router as auth_router
from .chat_router import router as chat_router
from .knowledge_router import router as knowledge_router
from .library_router import router as library_router
from .model_router import router as model_router

api_router = APIRouter()
api_router.include_router(agent_router)
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(knowledge_router)
api_router.include_router(library_router)
api_router.include_router(model_router)

__all__ = ["api_router"]
