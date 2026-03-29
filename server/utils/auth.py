from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import HTTPException, status
from fastapi_auth_middleware import FastAPIUser
from passlib.context import CryptContext

from src.configs.config import config

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


def verify_authorization_header(auth_header: str) -> tuple[list[str], FastAPIUser]:
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use Bearer token.",
        )

    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    user = FastAPIUser(
        first_name=payload.get("username", ""),
        last_name="",
        user_id=str(payload["sub"]),
    )
    return [], user
