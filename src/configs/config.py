import os
import tomllib

from pydantic import BaseModel, Field


class Config(BaseModel):
    save_dir: str = Field(default="./save", description="Directory for generated outputs")
    model_location: str = Field(default="./model", description="Local model directory")
    default_model: str = Field(
        default="dashscope/qwen3.5-plus-2026-02-15",
        description="Default model name",
    )
    fallback_model: str = Field(
        default="dashscope/qwen3.5-122b-a10b3",
        description="Fallback model name",
    )
    flash_model: str = Field(
        default="dashscope/qwen3.5-flash-2026-02-23",
        description="Fast model name",
    )
    embed_model: str = Field(default="xxxxx", description="Embedding model name")
    rerank_model: str = Field(default="xxxxx", description="Rerank model name")
    database_url: str = Field(default="", description="PostgreSQL DSN")
    jwt_secret: str = Field(default="", description="JWT secret key")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expire_minutes: int = Field(default=60, description="Access token lifetime")

    def __init__(self, **kwargs):
        env_values = {
            "database_url": os.getenv("DATABASE_URL", ""),
            "jwt_secret": os.getenv("JWT_SECRET", ""),
            "jwt_algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "jwt_expire_minutes": int(os.getenv("JWT_EXPIRE_MINUTES", "60")),
        }
        env_values.update(kwargs)
        super().__init__(**env_values)

    @classmethod
    def load_from_toml(cls, file_path: str) -> "Config":
        with open(file_path, "rb") as f:
            data = tomllib.load(f)
        return cls(**data)


config = Config()
