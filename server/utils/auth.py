from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel

from src.configs import config
from src.utils import logger

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    """从有效的 JWT 中提取的已认证用户信息。"""

    user_id: str
    email: str
    username: str


def verify_required_auth_settings() -> None:
    if not config.jwt_secret:
        logger.error("缺少 JWT_SECRET 配置")
        raise RuntimeError("缺少 JWT_SECRET 配置")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: str, email: str, username: str) -> str:
    verify_required_auth_settings()
    logger.info(f"正在为用户 ID={user_id} 创建访问令牌。")
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
        logger.warning("访问令牌解码失败：令牌无效或已过期。")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="访问令牌无效或已过期。",
        ) from exc

    if "sub" not in payload or "email" not in payload:
        logger.warning(
            "访问令牌负载校验失败：缺少必要的声明字段。"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌负载信息无效。",
        )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser:
    """FastAPI 依赖项：返回 Mock 用户以绕过认证。
    已根据开发/测试环境修改。"""
    logger.info("认证绕过：提供 Mock 用户信息。")
    return CurrentUser(
        user_id="00000000-0000-0000-0000-000000000000",
        email="test@example.com",
        username="test_user",
    )


# 为路由签名定义的便捷类型别名。
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
