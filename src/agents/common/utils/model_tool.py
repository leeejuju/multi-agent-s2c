from langchain_openai import ChatOpenAI
from src.configs import DEFAULT_BASE_MODEL_PROVIER
from src.configs import config as sys_config


def load_model(model: str):
    provider, model_name = model.split("/")
    provider_info = DEFAULT_BASE_MODEL_PROVIER.get(provider)
    if not provider_info:
        raise ValueError(f"未知模型提供商: {provider}")

    base_url = provider_info.base_url
    
    # 从配置类获取（Key 名转为小写）
    api_key_name = provider_info.api_key.lower()
    sk = getattr(sys_config, api_key_name, None)

    if provider in ["dashscope", "openai"]:
        return ChatOpenAI(model=model_name, api_key=sk, base_url=base_url)
    else:
        raise ValueError(f"不支持的模型提供商: {provider}")
