from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import (
    AuthenticatedUser,
    create_access_token,
    hash_password,
    verify_password,
)
from src.database import User, get_db
from src.utils import logger

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: EmailStr | None = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


async def _get_user_by_id(session: AsyncSession, user_id: str) -> User:
    user = await session.get(User, UUID(user_id))
    if user is None or not user.is_active:
        logger.warning(f"用户查询失败 (ID={user_id})：用户不存在或已禁用。")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="找不到该已认证用户。",
        )
    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)):
    logger.info(f"收到注册请求: 用户名={payload.username}。")
    existing_user = await session.scalar(
        select(User).where(User.username == payload.username)
    )
    if existing_user is not None:
        logger.warning(f"注册被拒绝，用户名已存在: 用户名={payload.username}。")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已存在。",
        )

    user = User(
        username=payload.username,
        email=None,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    logger.info(f"用户注册成功: 用户ID={user.id}。")
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)):
    logger.info(f"收到登录请求: 用户名={payload.username}。")
    user = await session.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_password(payload.password, user.password_hash):
        logger.warning(f"登录失败: 用户名={payload.username}。")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误。",
        )

    if not user.is_active:
        logger.warning(f"登录被拒绝，用户已禁用: 用户ID={user.id}。")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已禁用。",
        )

    token = create_access_token(str(user.id), user.email or "", user.username)
    logger.info(f"登录成功: 用户ID={user.id}。")
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: AuthenticatedUser, session: AsyncSession = Depends(get_db)):
    logger.info(f"请求当前用户信息: 用户ID={current_user.user_id}。")
    user = await _get_user_by_id(session, current_user.user_id)
    return UserResponse.model_validate(user)
