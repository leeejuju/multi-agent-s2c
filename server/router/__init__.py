from fastapi import APIRouter

from .auth import protected_router as protected_auth_router
from .auth import public_router as public_auth_router
from .chat import router as chat_router

public_api_router = APIRouter()
public_api_router.include_router(public_auth_router)

protected_api_router = APIRouter()
protected_api_router.include_router(protected_auth_router)
protected_api_router.include_router(chat_router)

__all__ = ["protected_api_router", "public_api_router"]
