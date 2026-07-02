from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import (
    AuthenticatedUser,
    create_access_token,
    hash_password,
    verify_password,
)
from src.database import get_db
from src.database.repositories import UserRepository
from src.utils import logger

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=5, max_length=5)
    email: EmailStr | None = None


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=5, max_length=5)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: str
    username: str
    email: EmailStr | None = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)):
    logger.info("Registration requested: username=%s.", payload.username)
    user_repository = UserRepository(session)
    existing_user = await user_repository.get_by_username(payload.username)
    if existing_user is not None:
        logger.warning(
            "Registration rejected; username already exists: %s.",
            payload.username,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    if payload.email is not None:
        existing_email = await user_repository.get_by_email(str(payload.email))
        if existing_email is not None:
            logger.warning(
                "Registration rejected; email already exists: %s.",
                payload.email,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists.",
            )

    user = await user_repository.create(
        username=payload.username,
        email=str(payload.email) if payload.email is not None else None,
        password_hash=hash_password(payload.password),
    )
    await session.commit()
    await session.refresh(user)
    logger.info("User registered: user_id=%s.", user.id)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)):
    logger.info("Login requested: username=%s.", payload.username)
    user_repository = UserRepository(session)
    user = await user_repository.get_by_username(payload.username)
    if user is None or not verify_password(payload.password, user.password_hash):
        logger.warning("Login failed: username=%s.", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not user.is_active:
        logger.warning("Login rejected; user is disabled: user_id=%s.", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled.",
        )

    token = create_access_token(user.id)
    logger.info("Login succeeded: user_id=%s.", user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: AuthenticatedUser):
    logger.info("Current user requested: user_id=%s.", current_user.id)
    return UserResponse.model_validate(current_user)
