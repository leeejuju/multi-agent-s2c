import tomllib
from pydantic import BaseModel, Field


class Config(BaseModel):
    save_dir: str = Field(..., description="保存目录")
    model_location: str = Field(..., description="模型位置")
    default_model: str = Field(
        default="dashscope/qwen3.5-plus-2026-02-15", description="默认模型"
    )
    fallback_model: str = Field(
        default="dashscope/qwen3.5-122b-a10b3", description="备用模型"
    )
    flash_model: str = Field(
        default="dashscope/qwen3.5-flash-2026-02-23", description="快速模型"
    )
    embed_model: str = Field(default="xxxxx", description="默认嵌入模型")
    rerank_model: str = Field(default="xxxxx", description="默认重排模型")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @classmethod
    def load_from_toml(cls, file_path: str) -> "Config":
        """从 TOML 文件加载配置"""
        with open(file_path, "rb") as f:
            data = tomllib.load(f)
        return cls(**data)


config = Config()
