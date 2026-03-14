from langchain_openai import ChatOpenAI
from src.configs import DEFAULT_BASE_MODEL_PROVIER


def load_model(model: str):
    provider, model_name = model.split("/")
    provider_info = DEFAULT_BASE_MODEL_PROVIER.get(provider)
    sk = provider_info.api_key
    base_url = provider_info.base_url

    if provider == "dashscope":

        return ChatOpenAI(model=model_name, api_key=sk, base_url=base_url)
    else:
        raise ValueError(f"不支持的模型提供商: {provider}")
