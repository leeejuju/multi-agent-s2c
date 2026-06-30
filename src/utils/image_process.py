from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError

from src.storage import build_file_key, get_storage

THUMBNAIL_MAX_SIZE = (256, 256)
THUMBNAIL_CONTENT_TYPE = "image/png"


@dataclass(slots=True)
class StoredImageAsset:
    """已存储的图片资源信息，包含原图和缩略图的路径及访问 URL。"""

    file_key: str
    access_url: str
    thumb_file_key: str | None = None
    thumb_url: str | None = None
    uploaded_keys: list[str] = field(default_factory=list)


def build_thumbnail_file_key(file_key: str) -> str:
    """根据原图路径生成缩略图的文件存储路径。"""
    path = Path(file_key)
    return str(path.with_name(f"{path.stem}_thumb.png")).replace("\\", "/")


def _generate_thumbnail_bytes(content: bytes) -> bytes | None:
    """同步生成图片缩略图字节，失败返回 None。"""
    try:
        with Image.open(BytesIO(content)) as image:
            processed = ImageOps.exif_transpose(image)
            if processed.mode not in {"RGB", "RGBA"}:
                processed = processed.convert("RGBA")

            thumbnail = processed.copy()
            thumbnail.thumbnail(THUMBNAIL_MAX_SIZE)

            output = BytesIO()
            thumbnail.save(output, format="PNG")
            return output.getvalue()
    except (UnidentifiedImageError, OSError):
        return None


async def store_image_assets(
    *,
    conversation_id: str | int,
    filename: str,
    content: bytes,
    content_type: str,
) -> StoredImageAsset:
    """存储原图并尝试生成缩略图。"""
    file_key = build_file_key(
        conversation_id=conversation_id,
        category="image",
        filename=filename,
    )
    await get_storage().upload_file("knowledgebases", file_key, content, content_type)
    uploaded_keys = [file_key]

    thumb_file_key: str | None = None
    thumbnail_bytes = await run_in_threadpool(_generate_thumbnail_bytes, content)
    if thumbnail_bytes:
        thumb_file_key = build_thumbnail_file_key(file_key)
        await get_storage().upload_file(
            "knowledgebases",
            thumb_file_key,
            thumbnail_bytes,
            THUMBNAIL_CONTENT_TYPE,
        )
        uploaded_keys.append(thumb_file_key)

    access_url = await get_storage().create_file_access_url("knowledgebases", file_key)
    thumb_url = access_url
    if thumb_file_key is not None:
        thumb_url = await get_storage().create_file_access_url(
            "knowledgebases",
            thumb_file_key,
        )

    return StoredImageAsset(
        file_key=file_key,
        access_url=access_url,
        thumb_file_key=thumb_file_key,
        thumb_url=thumb_url,
        uploaded_keys=uploaded_keys,
    )
