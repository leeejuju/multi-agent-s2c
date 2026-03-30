from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import AuthenticatedUser
from src.database import Attachment, Conversation, get_db
from src.storage import (
    build_object_key,
    create_object_access_url,
    delete_object,
    upload_object_bytes,
)

router = APIRouter(prefix="/files", tags=["files"])

MAX_FILES_PER_REQUEST = 10
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024
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


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    user_id: UUID
    file_name: str
    content_type: str
    file_size: int
    object_key: str
    category: str
    access_url: str


class AttachmentAccessUrlResponse(BaseModel):
    attachment_id: UUID
    access_url: str


def _infer_category(content_type: str) -> str:
    return "image" if content_type.startswith("image/") else "document"


def _build_attachment_response(
    attachment: Attachment,
    access_url: str,
) -> AttachmentResponse:
    return AttachmentResponse(
        id=attachment.id,
        conversation_id=attachment.conversation_id,
        user_id=attachment.user_id,
        file_name=attachment.file_name,
        content_type=attachment.content_type,
        file_size=attachment.file_size,
        object_key=attachment.file_path,
        category=_infer_category(attachment.content_type),
        access_url=access_url,
    )


async def _get_owned_conversation(
    session: AsyncSession,
    conversation_id: UUID,
    user_id: str,
) -> Conversation:
    conversation = await session.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == UUID(user_id),
        )
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation was not found.",
        )
    return conversation


async def _get_owned_attachment(
    session: AsyncSession,
    attachment_id: UUID,
    user_id: str,
) -> Attachment:
    attachment = await session.scalar(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == UUID(user_id),
        )
    )
    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment was not found.",
        )
    return attachment


async def _upload_attachments(
    *,
    files: list[UploadFile],
    conversation_id: UUID,
    current_user: AuthenticatedUser,
    session: AsyncSession,
    allowed_types: set[str],
    max_file_size: int,
    category: str,
) -> list[AttachmentResponse]:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required.",
        )
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files. Maximum is {MAX_FILES_PER_REQUEST}.",
        )

    await _get_owned_conversation(session, conversation_id, current_user.user_id)

    uploaded_keys: list[str] = []
    attachments: list[Attachment] = []
    try:
        for upload in files:
            content_type = (upload.content_type or "").lower()
            if content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported content type: {upload.content_type or 'unknown'}.",
                )

            content = await upload.read()
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{upload.filename or 'unknown'}' is empty.",
                )
            if len(content) > max_file_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{upload.filename or 'unknown'}' exceeds the size limit.",
                )

            object_key = build_object_key(
                conversation_id=conversation_id,
                category=category,
                filename=upload.filename or "file",
            )
            await upload_object_bytes(object_key, content, content_type)
            uploaded_keys.append(object_key)

            attachment = Attachment(
                conversation_id=conversation_id,
                user_id=UUID(current_user.user_id),
                file_name=upload.filename or "file",
                content_type=content_type,
                file_size=len(content),
                file_path=object_key,
            )
            session.add(attachment)
            attachments.append(attachment)

        await session.commit()
    except Exception:
        await session.rollback()
        for object_key in uploaded_keys:
            try:
                await delete_object(object_key)
            except HTTPException:
                pass
        raise

    responses: list[AttachmentResponse] = []
    for attachment in attachments:
        await session.refresh(attachment)
        access_url = await create_object_access_url(attachment.file_path)
        responses.append(_build_attachment_response(attachment, access_url))
    return responses


@router.post("/images", response_model=list[AttachmentResponse])
async def upload_images(
    current_user: AuthenticatedUser,
    conversation_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(get_db),
):
    return await _upload_attachments(
        files=files,
        conversation_id=conversation_id,
        current_user=current_user,
        session=session,
        allowed_types=ALLOWED_IMAGE_TYPES,
        max_file_size=MAX_IMAGE_SIZE,
        category="image",
    )


@router.post("/documents", response_model=list[AttachmentResponse])
async def upload_documents(
    current_user: AuthenticatedUser,
    conversation_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(get_db),
):
    return await _upload_attachments(
        files=files,
        conversation_id=conversation_id,
        current_user=current_user,
        session=session,
        allowed_types=ALLOWED_DOCUMENT_TYPES,
        max_file_size=MAX_DOCUMENT_SIZE,
        category="document",
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=list[AttachmentResponse],
)
async def list_conversation_attachments(
    conversation_id: UUID,
    current_user: AuthenticatedUser,
    session: AsyncSession = Depends(get_db),
):
    await _get_owned_conversation(session, conversation_id, current_user.user_id)
    attachments = list(
        await session.scalars(
            select(Attachment)
            .where(
                Attachment.conversation_id == conversation_id,
                Attachment.user_id == UUID(current_user.user_id),
            )
            .order_by(Attachment.created_at.desc())
        )
    )
    responses: list[AttachmentResponse] = []
    for attachment in attachments:
        access_url = await create_object_access_url(attachment.file_path)
        responses.append(_build_attachment_response(attachment, access_url))
    return responses


@router.post(
    "/{attachment_id}/access-url",
    response_model=AttachmentAccessUrlResponse,
)
async def get_attachment_access_url(
    attachment_id: UUID,
    current_user: AuthenticatedUser,
    session: AsyncSession = Depends(get_db),
):
    attachment = await _get_owned_attachment(
        session, attachment_id, current_user.user_id
    )
    access_url = await create_object_access_url(attachment.file_path)
    return AttachmentAccessUrlResponse(
        attachment_id=attachment.id,
        access_url=access_url,
    )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: UUID,
    current_user: AuthenticatedUser,
    session: AsyncSession = Depends(get_db),
):
    attachment = await _get_owned_attachment(
        session, attachment_id, current_user.user_id
    )
    await delete_object(attachment.file_path)
    await session.delete(attachment)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
