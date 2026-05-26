from fastapi import APIRouter

from .auth import router as auth_router
from .chat import router as chat_router
from .knowledge import router as knowledge_router
from .library import router as library_router
from .model import router as model_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(knowledge_router)
api_router.include_router(library_router)
api_router.include_router(model_router)

__all__ = ["api_router"]
