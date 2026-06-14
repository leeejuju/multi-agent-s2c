from collections.abc import Sequence
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from src.database.repositories import AttachmentRepository
from src.storage import (
    create_object_access_url,
    download_object_bytes,
    sanitize_filename,
    upload_object_bytes,
)

TMP_ATTACHMENT_PREFIX = "tmp/attachment"
CHAT_ATTACHMENT_PREFIX = "save"
CHAT_ATTACHMENT_SCOPE = "chat/attachment"


def safe_path_filter(filename: str | None) -> str:
    safe_name = sanitize_filename(filename or "file")
    return safe_name or "file"


def build_tmp_attachment_object_key(user_id: str, filename: str) -> str:
    return (
        f"{TMP_ATTACHMENT_PREFIX}/{user_id}/{CHAT_ATTACHMENT_SCOPE}/"
        f"{uuid4().hex}/{safe_path_filter(filename)}"
    )


def build_conversation_attachment_object_key(
    user_id: str,
    conversation_id: str | UUID,
    filename: str,
) -> str:
    return (
        f"{CHAT_ATTACHMENT_PREFIX}/{user_id}/{CHAT_ATTACHMENT_SCOPE}/"
        f"{conversation_id}/{uuid4().hex}/{safe_path_filter(filename)}"
    )


def _to_int(value: object) -> int:
    if isinstance(value, int):
        return max(0, value)
    return 0


def _is_tmp_object_key(user_id: str, object_key: str) -> bool:
    return object_key.startswith(f"{TMP_ATTACHMENT_PREFIX}/{user_id}/{CHAT_ATTACHMENT_SCOPE}/")


async def _copy_attachment(source_object_key: str, destination_object_key: str, content_type: str) -> None:
    content = await download_object_bytes(source_object_key)
    await upload_object_bytes(
        destination_object_key,
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

        source_object_key = str(attachment_data.get("object_key") or "")
        if not source_object_key:
            continue

        file_name = str(attachment_data.get("file_name") or "file")
        safe_file_name = safe_path_filter(file_name)
        content_type = str(
            attachment_data.get("content_type") or "application/octet-stream"
        )
        file_size = _to_int(attachment_data.get("file_size"))
        parse_status = attachment_data.get("parse_status")
        parse_error = attachment_data.get("parse_error")
        parser = attachment_data.get("parser")
        category = attachment_data.get("category")
        parse_metadata = attachment_data.get("parse_metadata")
        parsed_text = attachment_data.get("parsed_text")

        object_key = source_object_key
        if _is_tmp_object_key(user_id, source_object_key):
            object_key = build_conversation_attachment_object_key(
                user_id,
                conversation_id,
                safe_file_name,
            )
            await _copy_attachment(source_object_key, object_key, content_type)

        access_url = await create_object_access_url(object_key)
        thumb_url = attachment_data.get("thumb_url")
        if thumb_url is not None and not isinstance(thumb_url, str):
            thumb_url = None

        await repository.create(
            conversation_id=conversation_id,
            user_id=user_id,
            file_name=file_name,
            content_type=content_type,
            file_size=file_size,
            file_path=object_key,
        )

        normalized.append(
            {
                "id": attachment_data.get("id", ""),
                "file_name": file_name,
                "content_type": content_type,
                "file_size": file_size,
                "object_key": object_key,
                "category": category,
                "access_url": access_url,
                "thumb_url": thumb_url,
                "parser": parser,
                "parse_status": parse_status,
                "parse_error": parse_error,
                "parse_metadata": parse_metadata,
                "parsed_text": parsed_text,
            }
        )

    return normalized
