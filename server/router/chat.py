from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager
from src.storage import (
    build_object_key,
    create_object_access_url,
    delete_object,
    upload_object_bytes,
)
from src.utils import logger
from src.utils.image_process import store_image_assets

router = APIRouter(prefix="/chat", tags=["chat"])

# 配置常量
MAX_FILES_PER_REQUEST = 10
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024
NULL_CONVERSATION_ID = UUID("00000000-0000-0000-0000-000000000000")

# 文件类型限制
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
}
ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".docx",
}


class ChatAttachment(BaseModel):
    """请求携带的附件信息"""

    id: str
    file_name: str
    content_type: str
    access_url: str
    category: str | None = None
    thumb_url: str | None = None


class UploadedAttachmentResponse(BaseModel):
    """上传成功后的附件响应"""

    id: str
    file_name: str
    content_type: str
    file_size: int
    object_key: str
    category: str
    access_url: str
    thumb_url: str | None = None


class ChatRequest(BaseModel):
    """聊天请求负载"""

    input: str
    conversation_id: str | None = None
    attachments: list[ChatAttachment] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    """聊天响应结果"""

    content: str
    user_id: str
    agent_id: str
    conversation_id: str | None = None


def _file_extension(filename: str | None) -> str:
    """获取文件后缀名（小写）"""
    return Path(filename or "").suffix.lower()


def _is_allowed_file(
    *,
    filename: str | None,
    content_type: str,
    allowed_types: set[str],
    allowed_extensions: set[str],
) -> bool:
    """校验文件类型或后缀是否在允许范围内"""
    extension = _file_extension(filename)
    return content_type in allowed_types or extension in allowed_extensions


def _build_human_message(payload: ChatRequest) -> HumanMessage:
    """将请求负载转换为 LangChain 的 HumanMessage，处理文本和多模态（图片）内容"""
    if not payload.attachments:
        return HumanMessage(content=payload.input)

    content_blocks: list[dict[str, Any]] = []
    # 添加文本块
    if payload.input.strip():
        content_blocks.append({"type": "text", "text": payload.input})

    # 添加图片块
    for attachment in payload.attachments:
        if attachment.content_type.startswith("image/"):
            content_blocks.append(
                {
                    "type": "image_url",
                    "image_url": {"url": attachment.access_url},
                }
            )

    return HumanMessage(content=content_blocks or payload.input)


def _extract_response_content(response: dict[str, Any]) -> str:
    """从智能体响应中提取最后一条消息的文本内容"""
    messages = response.get("messages", [])
    if not messages:
        return ""

    last_message = messages[-1]
    content = getattr(last_message, "content", "")
    # 处理列表形式的消息内容（通常出现在多模态响应中）
    if isinstance(content, list):
        text_parts = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(part for part in text_parts if part)

    return str(content)


async def _upload_attachments(
    *,
    files: list[UploadFile],
    conversation_id: UUID | None,
    current_user: AuthenticatedUser,
    category: str,
    max_file_size: int,
    allowed_types: set[str],
    allowed_extensions: set[str],
    with_thumbnail: bool,
) -> list[UploadedAttachmentResponse]:
    """通用附件上传逻辑处理（含存储、缩略图生成及元数据组装）"""
    logger.info(
        f"收到上传请求: 用户ID={current_user.user_id}, 对话ID={conversation_id}, 文件数量={len(files)}, 类型={category}."
    )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少需要上传一个文件。",
        )
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"单次上传文件系统数量不能超过 {MAX_FILES_PER_REQUEST} 个。",
        )

    resolved_conversation_id = conversation_id or NULL_CONVERSATION_ID
    uploaded_keys: list[str] = []
    responses: list[UploadedAttachmentResponse] = []

    try:
        for upload in files:
            content_type = (upload.content_type or "").lower()
            # 校验合法性
            if not _is_allowed_file(
                filename=upload.filename,
                content_type=content_type,
                allowed_types=allowed_types,
                allowed_extensions=allowed_extensions,
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"不支持的 {category} 文件类型: {upload.filename or '未知'}.",
                )

            content = await upload.read()
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"文件 '{upload.filename or '未知'}' 内容为空。",
                )
            if len(content) > max_file_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"文件 '{upload.filename or '未知'}' 大小查过了限制。",
                )

            # 根据是否需要缩略图（图片类）走不同的存储流程
            if with_thumbnail:
                stored_image = await store_image_assets(
                    conversation_id=resolved_conversation_id,
                    filename=upload.filename or "image",
                    content=content,
                    content_type=content_type or "application/octet-stream",
                )
                object_key = stored_image.object_key
                access_url = stored_image.access_url
                thumb_url = stored_image.thumb_url
                uploaded_keys.extend(stored_image.uploaded_keys)
            else:
                object_key = build_object_key(
                    conversation_id=resolved_conversation_id,
                    category=category,
                    filename=upload.filename or "file",
                )
                await upload_object_bytes(
                    object_key,
                    content,
                    content_type or "application/octet-stream",
                )
                uploaded_keys.append(object_key)
                access_url = await create_object_access_url(object_key)
                thumb_url = None

            # 组装内存级响应（注：此处暂未持久化到数据库）
            responses.append(
                UploadedAttachmentResponse(
                    id=str(uuid4()),
                    file_name=upload.filename or "file",
                    content_type=content_type or "application/octet-stream",
                    file_size=len(content),
                    object_key=object_key,
                    category=category,
                    access_url=access_url,
                    thumb_url=thumb_url,
                )
            )
    except Exception:
        # 发生异常时回滚存储中的文件
        for object_key in uploaded_keys:
            try:
                await delete_object(object_key)
            except HTTPException:
                pass
        logger.exception(
            "上传失败，已尝试清理相关存储对象: 用户ID=%s, 对话ID=%s, 类型=%s.",
            current_user.user_id,
            resolved_conversation_id,
            category,
        )
        raise

    return responses


@router.post(
    "/attachments/images/upload",
    response_model=list[UploadedAttachmentResponse],
)
async def upload_images(
    current_user: AuthenticatedUser,
    conversation_id: UUID | None = Form(None),
    files: list[UploadFile] = File(...),
):
    """图片上传接口（支持生成缩略图）"""
    return await _upload_attachments(
        files=files,
        conversation_id=conversation_id,
        current_user=current_user,
        category="image",
        max_file_size=MAX_IMAGE_SIZE,
        allowed_types=ALLOWED_IMAGE_TYPES,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        with_thumbnail=True,
    )


@router.post(
    "/attachments/files/upload",
    response_model=list[UploadedAttachmentResponse],
)
async def upload_files(
    current_user: AuthenticatedUser,
    conversation_id: UUID | None = Form(None),
    files: list[UploadFile] = File(...),
):
    """通用文件上传接口"""
    return await _upload_attachments(
        files=files,
        conversation_id=conversation_id,
        current_user=current_user,
        category="document",
        max_file_size=MAX_DOCUMENT_SIZE,
        allowed_types=ALLOWED_DOCUMENT_TYPES,
        allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
        with_thumbnail=False,
    )


@router.post("/agent/{agent_id}/run", response_model=ChatResponse)
async def chat(
    agent_id: str,
    payload: ChatRequest,
    current_user: AuthenticatedUser,
):
    """调用智能体执行对话"""
    logger.info(
        f"收到对话请求: 用户ID={current_user.user_id}, 智能体ID={agent_id}, 对话ID={payload.conversation_id}.",
    )
    agent = agent_manager.get_agent(agent_id)
    if agent is None:
        logger.warning(f"对话请求失败: 未知的智能体ID={agent_id}.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到智能体 '{agent_id}'。",
        )

    # 通过 LangGraph/Agent 执行流式/非流式对话
    response = await agent.stream_messages(
        {"messages": [_build_human_message(payload)]},
        config=payload.config,
    )
    logger.info(
        f"对话请求处理完成: 用户ID={current_user.user_id}, 智能体ID={agent_id}, 对话ID={payload.conversation_id}.",
    )
    return ChatResponse(
        content=_extract_response_content(response),
        user_id=current_user.user_id,
        agent_id=agent_id,
        conversation_id=payload.conversation_id,
    )
