from collections.abc import Sequence
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.repositories import AttachmentRepository
from src.storage import (
    get_storage,
    sanitize_filename,
)

TMP_ATTACHMENT_PREFIX = "tmp"
CHAT_ATTACHMENT_PREFIX = "save"


def build_tmp_attachment_file_key(user_id: str, filename: str) -> str:
    return (
        f"{TMP_ATTACHMENT_PREFIX}/{user_id}/chat/attachment/"
        f"{uuid4().hex}/{sanitize_filename(filename or 'file')}"
    )


def build_conversation_attachment_file_key(
    user_id: str,
    conversation_id: str | int,
    attachment_id: str | int,
    filename: str,
) -> str:
    return (
        f"{CHAT_ATTACHMENT_PREFIX}/{user_id}/chat/{conversation_id}/"
        f"attachment/{attachment_id}/{sanitize_filename(filename or 'file')}"
    )


def _is_tmp_file_key(user_id: str, file_key: str) -> bool:
    return file_key.startswith(f"{TMP_ATTACHMENT_PREFIX}/{user_id}/chat/attachment/")


async def _copy_attachment(source_file_key: str, destination_file_key: str, content_type: str) -> None:
    content = await get_storage().download_file("knowledgebases", source_file_key)
    await get_storage().upload_file(
        "knowledgebases",
        destination_file_key,
        content,
        content_type or "application/octet-stream",
    )


async def prepare_attachments_for_conversation(
    db: AsyncSession,
    *,
    user_id: str,
    conversation_id: str,
    attachments: Sequence[object] | None = None,
) -> list[dict[str, object]]:
    repository = AttachmentRepository(session=db)
    normalized: list[dict[str, object]] = []

    for attachment in attachments or []:
        attachment_data = (
            attachment.model_dump()
            if hasattr(attachment, "model_dump")
            else attachment
        )
        if not isinstance(attachment_data, dict):
            continue

        attachment_id = str(attachment_data.get("id") or "")
        attachment_record = await repository.get_by_id_for_user(
            attachment_id,
            user_id,
        )
        if attachment_record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attachment not found.",
            )

        file_name = attachment_record.attachment_name
        content_type = attachment_record.attachment_type or "application/octet-stream"
        file_size = attachment_record.attachment_size
        parse_status = attachment_data.get("parse_status")
        parse_error = attachment_data.get("parse_error")
        parser = attachment_data.get("parser")
        category = attachment_data.get("category")
        if category not in {"image", "document"}:
            category = "image" if content_type.startswith("image/") else "document"
        parse_metadata = attachment_data.get("parse_metadata")
        parsed_text = attachment_data.get("parsed_text")

        file_key = attachment_record.attachment_path
        if attachment_record.status == "pending":
            if _is_tmp_file_key(user_id, file_key):
                file_key = build_conversation_attachment_file_key(
                    user_id,
                    conversation_id,
                    attachment_record.id,
                    file_name,
                )
                await _copy_attachment(
                    attachment_record.attachment_path,
                    file_key,
                    content_type,
                )
            await repository.mark_attached(
                attachment_record,
                conversation_id=conversation_id,
                attachment_path=file_key,
            )
        elif attachment_record.status not in {"pending", "attached"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attachment status is invalid.",
            )

        access_url = await get_storage().create_file_access_url(
            "knowledgebases",
            file_key,
        )

        normalized.append(
            {
                "id": str(attachment_record.id),
                "file_name": file_name,
                "content_type": content_type,
                "file_size": file_size,
                "file_key": file_key,
                "category": category,
                "access_url": access_url,
                "parser": parser,
                "parse_status": parse_status,
                "parse_error": parse_error,
                "parse_metadata": parse_metadata,
                "parsed_text": parsed_text,
            }
        )

    return normalized
