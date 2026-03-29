from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import create_access_token, hash_password, verify_password
from src.database import User, get_db

public_router = APIRouter(prefix="/auth", tags=["auth"])
protected_router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: EmailStr
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


async def _get_user_by_id(session: AsyncSession, user_id: str) -> User:
    user = await session.get(User, UUID(user_id))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user was not found.",
        )
    return user


@public_router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)):
    existing_user = await session.scalar(
        select(User).where(
            or_(User.email == payload.email, User.username == payload.username)
        )
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists.",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserResponse.model_validate(user)


@public_router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)):
    user = await session.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive.",
        )

    token = create_access_token(str(user.id), user.email, user.username)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@protected_router.get("/me", response_model=UserResponse)
async def me(request: Request, session: AsyncSession = Depends(get_db)):
    user = await _get_user_by_id(session, str(request.user.user_id))
    return UserResponse.model_validate(user)
