from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import get_current_user
from src.database import get_db


agent_router = APIRouter(prefix="/agent", tags=["agent_router"])



# def create_agent_run
