from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# 项目根目录: config.py -> configs/ -> src/ -> 项目根
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Config(BaseSettings):
    """配置管理: 环境变量 > .env > 代码默认值"""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------- 存储 ----------
    save_dir: str = Field(default="./save", description="生成产物的存储目录")
    model_location: str = Field(default="./model", description="本地模型存放目录")

    # ---------- 模型 ----------
    default_model: str = Field(
        default="dashscope/qwen3.5-plus-2026-02-15", description="默认使用的模型名称"
    )
    fallback_model: str = Field(
        default="dashscope/qwen3.5-122b-a10b3", description="备用模型名称"
    )
    flash_model: str = Field(
        default="dashscope/qwen3.5-flash-2026-02-23", description="快速推断模型名称"
    )
    embed_model: str = Field(default="", description="向量生成模型名称")
    rerank_model: str = Field(default="", description="重排序模型名称")

    # ---------- 数据库 ----------
    database_url: str = Field(default="", description="PostgreSQL 数据库连接地址")

    # ---------- JWT ----------
    jwt_secret: str = Field(default="", description="JWT 签名密钥")
    jwt_algorithm: str = Field(default="HS256", description="JWT 加密算法")
    jwt_expire_minutes: int = Field(default=60, description="Token 有效期（分钟）")

    # ---------- MinIO ----------
    minio_endpoint: str = Field(default="", description="MinIO 服务地址")
    minio_access_key: str = Field(default="", description="MinIO Access Key")
    minio_secret_key: str = Field(default="", description="MinIO Secret Key")
    minio_bucket: str = Field(default="", description="MinIO 桶名称")
    minio_secure: bool = Field(default=False, description="是否使用 HTTPS 访问 MinIO")
    minio_region: str = Field(default="", description="MinIO 所在的区域")
    minio_presign_expire_seconds: int = Field(
        default=600, description="MinIO 预签名 URL 有效期（秒）"
    )

    # ---------- 知识库 ----------
    graph_knowledge_provider: str = Field(
        default="lightrag", description="图知识库提供商"
    )
    vector_knowledge_provider: str = Field(
        default="milvus", description="向量知识库提供商"
    )
    lightrag_working_dir: str = Field(
        default="./save/lightrag", description="LightRAG 工作目录"
    )
    lightrag_workspace: str = Field(default="default", description="LightRAG 空间名称")
    milvus_uri: str = Field(default="", description="Milvus 连接地址")
    milvus_token: str = Field(default="", description="Milvus 访问令牌")
    milvus_db_name: str = Field(default="", description="Milvus 数据库名称")


config = Config()
