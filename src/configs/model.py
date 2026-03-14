from pydantic import BaseModel, Field


class BaseModelProvider(BaseModel):
    name: str = Field(..., description="模型名称")
    api_key: str = Field(..., description="API密钥")
    default_model: str = Field(..., description="默认模型")
    base_url: str = Field(..., description="API基础URL")
    model_list: list[str] = Field(..., description="模型列表")


# class EmbedModelInfo(BaseModel):
#     name: str = Field(..., description="模型名称")
#     api_key: str = Field(..., description="API密钥")
#     base_url: str = Field(..., description="API基础URL")


DEFAULT_BASE_MODEL_PROVIER: dict[str, BaseModelProvider] = {
    "dashscope": BaseModelProvider(
        name="dashscope",
        api_key="DASHSCOPE_API_KEY",
        default_model="qwen3.5-plus",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        model_list=[
            "qwen3.5-plus",
            "qwen3.5-plus-2026-02-15",
            "qwen3.5-flash-2026-02-23",
            "qwen3.5-122b-a10b",
        ],
    ),
    "openai": BaseModelProvider(
        name="openai",
        api_key="OPENAI_API_KEY",
        default_model="gpt-4o",
        base_url="https://api.openai.com/v1",
        model_list=["gpt-4o", "gpt-4o-mini"],
    ),
    "gemini": BaseModelProvider(
        name="gemini",
        api_key="GEMINI_API_KEY",
        default_model="gemini-3-pro",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        model_list=[
            "gemini-3.1-pro",
            "gemini-3-pro",
            "gemini-3-flash",
            "gemini-2.5-pro",
            "gemini-2.5-flash",
        ],
    ),
}
