from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from uuid import UUID

from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError

from src.storage import build_object_key, create_object_access_url, upload_object_bytes

THUMBNAIL_MAX_SIZE = (256, 256)
THUMBNAIL_CONTENT_TYPE = "image/png"


@dataclass(slots=True)
class StoredImageAsset:
    """已存储的图片资产信息，包含原始图和缩略图的路径及访问 URL。"""
    object_key: str
    access_url: str
    thumb_object_key: str | None = None
    thumb_url: str | None = None
    uploaded_keys: list[str] = field(default_factory=list)


def build_thumbnail_object_key(object_key: str) -> str:
    """根据原图路径生成缩略图的存储路径（Key）。"""
    path = Path(object_key)
    return str(path.with_name(f"{path.stem}_thumb.png")).replace("\\", "/")


def _generate_thumbnail_bytes(content: bytes) -> bytes | None:
    """同步生成图片的缩略图字节数据。成功返回字节，失败返回 None。"""
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
    conversation_id: UUID,
    filename: str,
    content: bytes,
    content_type: str,
) -> StoredImageAsset:
    """存储原始图片并尝试生成/存储对应的缩略图，返回图片资产信息。"""
    object_key = build_object_key(
        conversation_id=conversation_id,
        category="image",
        filename=filename,
    )
    await upload_object_bytes(object_key, content, content_type)
    uploaded_keys = [object_key]

    thumb_object_key: str | None = None
    thumbnail_bytes = await run_in_threadpool(_generate_thumbnail_bytes, content)
    if thumbnail_bytes:
        thumb_object_key = build_thumbnail_object_key(object_key)
        await upload_object_bytes(
            thumb_object_key,
            thumbnail_bytes,
            THUMBNAIL_CONTENT_TYPE,
        )
        uploaded_keys.append(thumb_object_key)

    access_url = await create_object_access_url(object_key)
    thumb_url = access_url
    if thumb_object_key is not None:
        thumb_url = await create_object_access_url(thumb_object_key)

    return StoredImageAsset(
        object_key=object_key,
        access_url=access_url,
        thumb_object_key=thumb_object_key,
        thumb_url=thumb_url,
        uploaded_keys=uploaded_keys,
    )
