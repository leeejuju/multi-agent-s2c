from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel

from src.configs.config import config

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_bearer_scheme = HTTPBearer()


class CurrentUser(BaseModel):
    """Authenticated user extracted from a valid JWT."""

    user_id: str
    email: str
    username: str


def verify_required_auth_settings() -> None:
    if not config.jwt_secret:
        raise RuntimeError("JWT_SECRET is required for authentication.")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: str, email: str, username: str) -> str:
    verify_required_auth_settings()
    expire_at = datetime.now(UTC) + timedelta(minutes=config.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "username": username,
        "exp": expire_at,
    }
    return jwt.encode(payload, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    verify_required_auth_settings()
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret,
            algorithms=[config.jwt_algorithm],
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc

    if "sub" not in payload or "email" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is invalid.",
        )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> CurrentUser:
    """FastAPI dependency that validates the Bearer token and returns the
    authenticated user.  Use via ``Depends(get_current_user)``."""
    payload = decode_access_token(credentials.credentials)
    return CurrentUser(
        user_id=str(payload["sub"]),
        email=payload["email"],
        username=payload.get("username", ""),
    )


# Convenience type alias for route signatures.
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
