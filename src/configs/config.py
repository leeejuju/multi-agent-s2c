from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# 项目根目录: config.py -> configs/ -> src/ -> 项目根
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class MilvusConfig(BaseSettings):
    """Milvus 知识库配置。"""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    uri: str = Field(
        default="",
        validation_alias="MILVUS_URI",
        description="Milvus 连接地址",
    )
    token: str = Field(
        default="",
        validation_alias="MILVUS_TOKEN",
        description="Milvus 访问令牌",
    )
    db_name: str = Field(
        default="",
        validation_alias="MILVUS_DB_NAME",
        description="Milvus 数据库名称",
    )


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
        default="dashscope/qwen3.6-plus", description="默认使用的模型名称"
    )
    fallback_model: str = Field(
        default="dashscope/qwen3.6-plus", description="备用模型名称"
    )
    flash_model: str = Field(
        default="dashscope/qwen3.6-plus", description="快速推断模型名称"
    )
    image_model: str = Field(default="qwen-image-2.0-pro-2026-04-22", description="图片生成模型名称")

    
    embed_model: str = Field(default="", description="向量生成模型名称")
    rerank_model: str = Field(default="", description="重排序模型名称")

    # ---------- 数据库 ----------
    database_url: str = Field(default="", description="PostgreSQL 数据库连接地址")
    redis_url: str = Field(default="redis://8.136.2.212:6379/0", description="Redis 连接地址")
    arq_queue_name: str = Field(default="agent-runs", description="ARQ 队列名称")
    arq_max_jobs: int = Field(default=64, description="ARQ worker 最大并发任务数")
    enable_run_queue: bool = Field(default=False, description="是否使用 ARQ/Redis 执行 agent run")
    agent_event_persist_enabled: bool = Field(default=True, description="是否持久化 agent run 流式事件")
    redis_pool_max_connections: int = Field(default=20, description="Redis 连接池最大连接数")
    run_stream_poll_timeout_ms: int = Field(
        default=15000, description="Redis Stream 阻塞读取超时时间"
    )
    run_stream_max_len: int = Field(default=10000, description="单个 run 事件流保留长度")

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
    milvus: MilvusConfig = Field(
        default_factory=MilvusConfig,
        description="Milvus 知识库配置",
    )

    # ---------- Search ----------
    tavily_api_key: str = Field(default="", description="Tavily Web Search API Key")
    search_max_concurrency: int = Field(default=4, description="并行搜索最大任务数")
    search_route_timeout_seconds: float = Field(default=8.0, description="单路搜索超时时间")
    local_reference_root: str = Field(default="", description="本地参考资料搜索根目录")

    # ---------- Document Parser APIs ----------
    mineru_api_url: str = Field(default="", description="MinerU parsing API URL")
    mineru_api_key: str = Field(default="", description="MinerU parsing API key")
    paddle_ocr_api_url: str = Field(default="https://paddleocr.aistudio-app.com/api/v2/ocr/jobs", description="PaddleOCR parsing API URL")
    paddle_ocr_api_key: str = Field(default="a7bbafaf11b02db719bacf50084985f7c6b2b015", description="PaddleOCR parsing API key")
    document_parser_api_timeout_seconds: float = Field(
        default=120.0, description="Document parser API request timeout"
    )

    # ---------- Sandbox ----------
    sandbox_provisioner_url: str = Field(
        default="", description="Sandbox provisioner service URL"
    )

    # ---------- Langfuse ----------
    langfuse_public_key: str = Field(default="", description="Langfuse Public Key")
    langfuse_secret_key: str = Field(default="", description="Langfuse Secret Key")
    langfuse_base_url: str = Field(
        default="https://cloud.langfuse.com", description="Langfuse 服务地址"
    )
    langfuse_tracing_enabled: bool = Field(default=False, description="是否启用 Langfuse tracing")
    langfuse_tracing_environment: str = Field(default="development", description="Langfuse 环境")

    # ---------- API Keys ----------
    dashscope_api_key: str = Field(default="", description="阿里 DashScope API Key")
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    gemini_api_key: str = Field(default="", description="Gemini API Key")


config = Config()
