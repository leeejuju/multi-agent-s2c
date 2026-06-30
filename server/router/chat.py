from pathlib import Path
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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
from server.service.conversation_service import (
    build_tmp_attachment_file_key,
)
from server.utils.auth import AuthenticatedUser
from src.agents import agent_manager
from src.database import get_db
from src.database.repositories import AttachmentRepository
from src.storage import get_storage
from src.utils import logger

router = APIRouter(prefix="/chat", tags=["chat"])

# 閰嶇疆甯搁噺
MAX_FILES_PER_REQUEST = 10
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024

# 鏂囦欢绫诲瀷闄愬埗
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
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/xhtml+xml",
    "text/plain",
    "text/html",
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
    ".txt",
    ".md",
    ".markdown",
    ".docx",
    ".html",
    ".htm",
    ".json",
    ".csv",
    ".xls",
    ".xlsx",
    ".pdf",
    ".pptx",
}


class ChatAttachment(BaseModel):
    """请求携带的附件信息。"""

    id: str
    file_name: str
    content_type: str
    file_size: int | None = None
    file_key: str | None = None
    access_url: str
    category: str | None = None
    thumb_url: str | None = None
    parser: str | None = None
    parse_status: str | None = None
    parse_error: str | None = None
    parsed_text: str | None = None
    parse_metadata: dict[str, Any] = Field(default_factory=dict)


class UploadedAttachmentResponse(BaseModel):
    """上传成功后的附件响应。"""

    id: str
    file_name: str
    content_type: str
    file_size: int
    file_key: str
    category: str
    access_url: str
    thumb_url: str | None = None
    parser: str | None = None
    parse_status: str | None = None
    parse_error: str | None = None
    parsed_text: str | None = None
    parse_metadata: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    """聊天请求负载。"""

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
    agent_id: str
    status: str
    error: str | None = None
    created_at: str


class AgentSummary(BaseModel):
    id: str
    name: str
    description: str


def _file_extension(filename: str | None) -> str:
    """获取文件后缀名。"""
    return Path(filename or "").suffix.lower()


def _is_allowed_file(
    *,
    filename: str | None,
    content_type: str,
    allowed_types: set[str],
    allowed_extensions: set[str],
) -> bool:
    """校验文件类型或后缀是否允许。"""
    extension = _file_extension(filename)
    return content_type in allowed_types or extension in allowed_extensions


@router.get("/agents", response_model=list[AgentSummary])
async def list_agent_summaries(current_user: AuthenticatedUser):
    return [AgentSummary(**agent) for agent in agent_manager.list_agents()]


async def _upload_attachments(
    *,
    db: AsyncSession,
    files: list[UploadFile],
    current_user: AuthenticatedUser,
) -> list[UploadedAttachmentResponse]:
    """通用附件上传处理。"""
    logger.info(
        f"收到上传请求: 用户ID={current_user.user_id}, 文件数量={len(files)}, 类型=tmp_attachment."
    )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少需要上传一个文件。",
        )
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"单次上传文件数量不能超过 {MAX_FILES_PER_REQUEST} 个。",
        )

    uploaded_keys: list[str] = []
    responses: list[UploadedAttachmentResponse] = []
    repository = AttachmentRepository(db)

    try:
        for upload in files:
            content_type = (upload.content_type or "").lower()
            if _is_allowed_file(
                filename=upload.filename,
                content_type=content_type,
                allowed_types=ALLOWED_IMAGE_TYPES,
                allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
            ):
                category = "image"
                max_file_size = MAX_IMAGE_SIZE
            elif _is_allowed_file(
                filename=upload.filename,
                content_type=content_type,
                allowed_types=ALLOWED_DOCUMENT_TYPES,
                allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
            ):
                category = "document"
                max_file_size = MAX_DOCUMENT_SIZE
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"不支持的附件文件类型: {upload.filename or '未知'}.",
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
                    detail=f"文件 '{upload.filename or '未知'}' 大小超过限制。",
                )

            original_filename = upload.filename or "file"
            file_key = build_tmp_attachment_file_key(
                current_user.user_id,
                original_filename,
            )
            upload_started_at = perf_counter()
            await get_storage().upload_file(
                "knowledgebases",
                file_key,
                content,
                content_type or "application/octet-stream",
            )
            upload_duration_ms = (perf_counter() - upload_started_at) * 1000
            logger.info(
                "附件上传到 tmp 完成: 用户ID=%s, 文件名=%s, file_key=%s, 文件大小=%s, 耗时=%.2fms.",
                current_user.user_id,
                original_filename,
                file_key,
                len(content),
                upload_duration_ms,
            )
            uploaded_keys.append(file_key)
            attachment = await repository.create_pending(
                user_id=current_user.user_id,
                attachment_name=original_filename,
                attachment_type=content_type or "application/octet-stream",
                attachment_size=len(content),
                attachment_path=file_key,
            )
            access_url = await get_storage().create_file_access_url(
                "knowledgebases",
                file_key,
            )

            responses.append(
                UploadedAttachmentResponse(
                    id=str(attachment.id),
                    file_name=original_filename,
                    content_type=content_type or "application/octet-stream",
                    file_size=len(content),
                    file_key=file_key,
                    category=category,
                    access_url=access_url,
                    thumb_url=None,
                )
            )
        await db.commit()
    except Exception:
        await db.rollback()
        # 发生异常时回滚存储中的文件
        for file_key in uploaded_keys:
            try:
                await get_storage().delete_file("knowledgebases", file_key)
            except HTTPException:
                pass
        logger.exception(
            "上传失败，已尝试清理相关存储文件: 用户ID=%s, 对话ID=%s, 类型=%s.",
            current_user.user_id,
            None,
            "tmp_attachment",
        )
        raise

    return responses


@router.post(
    "/attachment/tmp/upload",
    response_model=list[UploadedAttachmentResponse],
)
async def upload_tmp_attachments(
    current_user: AuthenticatedUser,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """附件上传到临时路径，不触发对话。"""
    return await _upload_attachments(
        db=db,
        files=files,
        current_user=current_user,
    )


def _run_response(run) -> AgentRunResponse:
    return AgentRunResponse(
        id=str(run.id),
        conversation_id=str(run.conversation_id),
        agent_id=run.agent_id,
        status=run.status,
        error=run.error,
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
        f"鏀跺埌 agent run 璇锋眰: 鐢ㄦ埛ID={current_user.user_id}, 鏅鸿兘浣揑D={agent_id}, 瀵硅瘽ID={payload.conversation_id}.",
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
    return _run_response(run)


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
