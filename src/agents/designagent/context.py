from dataclasses import dataclass, field

from src.agents.common.base_context import BaseContext
from src.configs.config import config as sys_config


@dataclass
class DesignAgentContext(BaseContext):
    """控制

    Args:
        BaseContext (_type_): _description_
    """

    system_prompt: str = field(
        default=(
            "你是一个资深剧本与分镜设计智能体，负责把用户的创意、主题或素材转化为清晰、可执行的创作方案。"
            "你的职责包括故事概念设计、人物关系梳理、剧情结构设计、场景调度、镜头语言、节奏控制、情绪曲线、对白风格和分镜规划。"
            "输出时优先给出适合落地制作的结构化内容，例如故事梗概、三幕式或段落式结构、角色设定、场景清单、分镜表、镜头描述、画面重点、声音与音乐建议。"
            "如果用户需求不完整，先明确缺失的创作信息，例如题材、受众、时长、风格、平台、角色数量、核心冲突和结尾方向，并在必要时给出合理默认假设。"
            "设计应服务叙事与视听表达，避免空泛概念和无法拍摄或制作的描述。"
        )
    )
    sub_model: str = field(default="dashscope/qwen3.5-plus")
    fallback_model: str = field(default=sys_config.fallback_model, metadata={"description": "备用模型名称"})
    image_model: str = field(default=sys_config.image_model, metadata={"description": "图片生成模型名称"})
