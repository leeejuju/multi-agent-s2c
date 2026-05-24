from typing import Any

from src.configs import DEFAULT_BASE_MODEL_PROVIER
from src.configs.config import config


def list_models() -> dict[str, Any]:
    models: list[dict[str, Any]] = []

    for provider_name, provider in DEFAULT_BASE_MODEL_PROVIER.items():
        for model_name in provider.model_list:
            model_id = f"{provider_name}/{model_name}"
            models.append(
                {
                    "id": model_id,
                    "name": model_name,
                    "provider": provider_name,
                    "is_default": model_id == config.default_model,
                    "is_fallback": model_id == config.fallback_model,
                    "is_flash": model_id == config.flash_model,
                }
            )

    return {
        "default_model": config.default_model,
        "fallback_model": config.fallback_model,
        "flash_model": config.flash_model,
        "image_model": config.image_model,
        "models": models,
    }
