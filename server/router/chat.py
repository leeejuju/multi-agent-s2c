from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from server.service import (
    cancel_run,
    create_agent_run,
    delete_conversation,
    get_active_run,
    get_conversation,
    get_messages,
    list_conversations,
    stream_run_events,
)
from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager
from src.database import get_db
from src.database.repositories import RunRepository
from src.plugins.document_parser import (
    DocumentParseRequest,
    DocumentParseResult,
    DocumentParserRunner,
)
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
    "application/csv",
    "text/plain",
    "text/markdown",
    "text/csv",
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
    ".csv",
    ".json",
    ".docx",
}
MAX_PARSED_DOCUMENT_CHARS = 80_000


class ChatAttachment(BaseModel):
    """请求携带的附件信息"""

    id: str
    file_name: str
    content_type: str
    file_size: int | None = None
    object_key: str | None = None
    access_url: str
    category: str | None = None
    thumb_url: str | None = None
    parser: str | None = None
    parse_status: str | None = None
    parse_error: str | None = None
    parsed_text: str | None = None
    parse_metadata: dict[str, Any] = Field(default_factory=dict)


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
    parser: str | None = None
    parse_status: str | None = None
    parse_error: str | None = None
    parsed_text: str | None = None
    parse_metadata: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    """聊天请求负载"""

    input: str
    conversation_id: str | None = None
    attachments: list[ChatAttachment] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    status: str = "completed"
    created_at: str


class AgentRunResponse(BaseModel):
    id: str
    conversation_id: str
    user_message_id: str
    assistant_message_id: str
    agent_id: str
    status: str
    error: str | None = None
    latest_sequence: int = 0
    created_at: str


class AgentSummary(BaseModel):
    id: str
    name: str
    description: str


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


def _truncate_parsed_text(text: str) -> tuple[str, bool]:
    if len(text) <= MAX_PARSED_DOCUMENT_CHARS:
        return text, False
    return (
        text[:MAX_PARSED_DOCUMENT_CHARS]
        + "\n\n[Document content truncated by backend parser.]",
        True,
    )


async def _parse_uploaded_document_with_docling(
    *,
    file_name: str,
    content_type: str,
    content: bytes,
) -> dict[str, Any]:
    request = DocumentParseRequest(
        file_name=file_name,
        content_type=content_type,
        content=content,
        parser_name="docling",
    )
    runner = DocumentParserRunner(max_workers=1)
    events = []
    try:
        async for event in runner.parse(request):
            events.append(event)
    finally:
        await runner.aclose()

    result = DocumentParseResult.from_events(
        request=request,
        parser="docling",
        events=events,
    )
    parsed_text, truncated = _truncate_parsed_text(result.content.strip())
    warning_messages = [
        event.message
        for event in events
        if event.type == "warning" and event.message
    ]
    parse_error = result.error
    if not parse_error and warning_messages and not result.success:
        parse_error = warning_messages[-1]

    parse_metadata = {
        **dict(result.metadata),
        "event_count": len(events),
        "truncated": truncated,
        "warning_count": len(warning_messages),
    }
    if warning_messages:
        parse_metadata["warnings"] = warning_messages

    return {
        "parser": result.parser,
        "parse_status": "success" if result.success else "failed",
        "parse_error": parse_error,
        "parsed_text": parsed_text or None,
        "parse_metadata": parse_metadata,
    }


@router.get("/agents", response_model=list[AgentSummary])
async def list_agent_summaries(current_user: AuthenticatedUser):
    return [AgentSummary(**agent) for agent in agent_manager.list_agents()]


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

            parse_result: dict[str, Any] = {}
            if category == "document":
                parse_result = await _parse_uploaded_document_with_docling(
                    file_name=upload.filename or "file",
                    content_type=content_type or "application/octet-stream",
                    content=content,
                )

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
                    **parse_result,
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


def _run_response(run, latest_sequence: int = 0) -> AgentRunResponse:
    return AgentRunResponse(
        id=str(run.id),
        conversation_id=str(run.conversation_id),
        user_message_id=str(run.user_message_id),
        assistant_message_id=str(run.assistant_message_id),
        agent_id=run.agent_id,
        status=run.status,
        error=run.error,
        latest_sequence=latest_sequence,
        created_at=run.created_at.isoformat(),
    )


@router.post("/agent/{agent_id}/runs", response_model=AgentRunResponse)
async def create_chat_run(
    agent_id: str,
    payload: ChatRequest,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    """创建后台 agent run。"""
    logger.info(
        f"收到 agent run 请求: 用户ID={current_user.user_id}, 智能体ID={agent_id}, 对话ID={payload.conversation_id}.",
    )
    run = await create_agent_run(
        db,
        agent_id=agent_id,
        input_text=payload.input,
        conversation_id=payload.conversation_id,
        user_id=current_user.user_id,
        attachments=payload.attachments,
        request_config=payload.config,
    )
    return _run_response(run)


@router.get("/runs/{run_id}/stream")
async def chat_run_stream(
    run_id: str,
    current_user: AuthenticatedUser,
    after_sequence: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """可恢复的 run 事件流。"""
    return StreamingResponse(
        stream_run_events(
            db,
            user_id=current_user.user_id,
            run_id=run_id,
            after_sequence=after_sequence,
        ),
        media_type="text/event-stream",
    )


@router.post("/runs/{run_id}/cancel", response_model=AgentRunResponse)
async def cancel_chat_run(
    run_id: str,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    run = await cancel_run(db, run_id=run_id, user_id=current_user.user_id)
    return _run_response(run)


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversation_summaries(
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    conversations = await list_conversations(db, current_user.user_id)
    return [
        ConversationSummary(
            id=str(c.id),
            title=c.title,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.get(
    "/conversations/{conversation_id}/runs/active",
    response_model=AgentRunResponse | None,
)
async def get_active_conversation_run(
    conversation_id: str,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    run = await get_active_run(
        db,
        conversation_id=conversation_id,
        user_id=current_user.user_id,
    )
    if run is None:
        return None
    latest_sequence = await RunRepository(db).latest_sequence(str(run.id))
    return _run_response(run, latest_sequence=latest_sequence)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def get_conversation_messages(
    conversation_id: str,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    await get_conversation(db, conversation_id, current_user.user_id)
    messages = await get_messages(db, conversation_id)
    return [
        MessageResponse(
            id=str(m.id),
            role=m.role,
            content=m.content,
            status=m.status,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(dependency=get_db),
):
    await delete_conversation(db, conversation_id, current_user.user_id)
