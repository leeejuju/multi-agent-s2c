import os
import tomllib

from pydantic import BaseModel, Field


def _get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


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
    minio_endpoint: str = Field(default="", description="MinIO endpoint")
    minio_access_key: str = Field(default="", description="MinIO access key")
    minio_secret_key: str = Field(default="", description="MinIO secret key")
    minio_bucket: str = Field(default="", description="MinIO bucket name")
    minio_secure: bool = Field(default=False, description="Use HTTPS for MinIO")
    minio_region: str = Field(default="", description="MinIO region")
    minio_presign_expire_seconds: int = Field(
        default=600, description="Presigned URL expiration time"
    )
    graph_knowledge_provider: str = Field(
        default="lightrag", description="Graph knowledge provider"
    )
    vector_knowledge_provider: str = Field(
        default="milvus", description="Vector knowledge provider"
    )
    lightrag_working_dir: str = Field(
        default="./save/lightrag", description="LightRAG working directory"
    )
    lightrag_workspace: str = Field(
        default="default", description="LightRAG workspace name"
    )
    milvus_uri: str = Field(default="", description="Milvus connection URI")
    milvus_token: str = Field(default="", description="Milvus access token")
    milvus_db_name: str = Field(default="", description="Milvus database name")

    def __init__(self, **kwargs):
        env_values = {
            "database_url": os.getenv("DATABASE_URL", ""),
            "jwt_secret": os.getenv("JWT_SECRET", ""),
            "jwt_algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "jwt_expire_minutes": int(os.getenv("JWT_EXPIRE_MINUTES", "60")),
            "minio_endpoint": os.getenv("MINIO_ENDPOINT", ""),
            "minio_access_key": os.getenv("MINIO_ACCESS_KEY", ""),
            "minio_secret_key": os.getenv("MINIO_SECRET_KEY", ""),
            "minio_bucket": os.getenv("MINIO_BUCKET", ""),
            "minio_secure": _get_bool_env("MINIO_SECURE", False),
            "minio_region": os.getenv("MINIO_REGION", ""),
            "minio_presign_expire_seconds": int(
                os.getenv("MINIO_PRESIGN_EXPIRE_SECONDS", "600")
            ),
            "graph_knowledge_provider": os.getenv(
                "GRAPH_KNOWLEDGE_PROVIDER", "lightrag"
            ),
            "vector_knowledge_provider": os.getenv(
                "VECTOR_KNOWLEDGE_PROVIDER", "milvus"
            ),
            "lightrag_working_dir": os.getenv(
                "LIGHTRAG_WORKING_DIR", "./save/lightrag"
            ),
            "lightrag_workspace": os.getenv("LIGHTRAG_WORKSPACE", "default"),
            "milvus_uri": os.getenv("MILVUS_URI", ""),
            "milvus_token": os.getenv("MILVUS_TOKEN", ""),
            "milvus_db_name": os.getenv("MILVUS_DB_NAME", ""),
        }
        env_values.update(kwargs)
        super().__init__(**env_values)

    @classmethod
    def load_from_toml(cls, file_path: str) -> "Config":
        with open(file_path, "rb") as f:
            data = tomllib.load(f)
        return cls(**data)


config = Config()
