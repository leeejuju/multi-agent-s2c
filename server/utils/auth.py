from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from passlib.context import CryptContext
from pydantic import BaseModel

from src.configs import config
from src.utils import logger

password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class CurrentUser(BaseModel):
    user_id: str
    email: str
    username: str


def verify_required_auth_settings() -> None:
    if not config.jwt_secret:
        logger.error("Missing JWT_SECRET configuration.")
        raise RuntimeError("Missing JWT_SECRET configuration.")


def get_jwt_key() -> bytes:
    verify_required_auth_settings()
    return sha256(config.jwt_secret.encode("utf-8")).digest()


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: str, email: str, username: str) -> str:
    verify_required_auth_settings()
    logger.info("Creating access token: user_id=%s.", user_id)
    expire_at = datetime.now(UTC) + timedelta(minutes=config.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "username": username,
        "exp": expire_at,
    }
    return jwt.encode(payload, get_jwt_key(), algorithm=config.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    verify_required_auth_settings()
    try:
        payload = jwt.decode(
            token,
            get_jwt_key(),
            algorithms=[config.jwt_algorithm],
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("Access token decode failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is invalid or expired.",
        ) from exc

    if "sub" not in payload or "email" not in payload:
        logger.warning("Access token payload validation failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token payload is invalid.",
        )
    return payload


async def get_current_user(request: Request) -> CurrentUser:
    user = getattr(request.state, "user", None)
    if isinstance(user, CurrentUser):
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided.",
    )


AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
