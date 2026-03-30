import re
import unicodedata
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from minio import Minio
from minio.error import S3Error

from src.configs.config import config

_storage_instance: "MinioStorage | None" = None
_unsafe_filename_pattern = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str) -> str:
    normalized = unicodedata.normalize("NFKD", filename or "").encode(
        "ascii", "ignore"
    ).decode("ascii")
    sanitized = _unsafe_filename_pattern.sub("_", normalized).strip("._")
    return sanitized or "file"


def build_object_key(conversation_id: UUID, category: str, filename: str) -> str:
    safe_filename = sanitize_filename(filename)
    now = datetime.now(UTC)
    folder = "images" if category == "image" else "documents"
    return (
        f"conversations/{conversation_id}/{folder}/{now:%Y}/{now:%m}/"
        f"{uuid4()}_{safe_filename}"
    )


class MinioStorage:
    def __init__(self) -> None:
        self._client: Minio | None = None

    def _verify_required_settings(self) -> None:
        required_settings = {
            "MINIO_ENDPOINT": config.minio_endpoint,
            "MINIO_ACCESS_KEY": config.minio_access_key,
            "MINIO_SECRET_KEY": config.minio_secret_key,
            "MINIO_BUCKET": config.minio_bucket,
        }
        missing = [name for name, value in required_settings.items() if not value]
        if missing:
            raise RuntimeError(
                f"Missing required MinIO settings: {', '.join(sorted(missing))}."
            )

    def get_client(self) -> Minio:
        if self._client is None:
            self._verify_required_settings()
            self._client = Minio(
                endpoint=config.minio_endpoint,
                access_key=config.minio_access_key,
                secret_key=config.minio_secret_key,
                secure=config.minio_secure,
                region=config.minio_region or None,
            )
        return self._client

    async def ensure_ready(self) -> None:
        client = self.get_client()
        exists = await run_in_threadpool(client.bucket_exists, config.minio_bucket)
        if not exists:
            await run_in_threadpool(client.make_bucket, config.minio_bucket)

    async def upload_object_bytes(
        self,
        object_key: str,
        content: bytes,
        content_type: str,
    ) -> None:
        client = self.get_client()
        stream = BytesIO(content)
        try:
            await run_in_threadpool(
                client.put_object,
                config.minio_bucket,
                object_key,
                stream,
                len(content),
                content_type=content_type,
            )
        except S3Error as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to store the file.",
            ) from exc

    async def delete_object(self, object_key: str) -> None:
        client = self.get_client()
        try:
            await run_in_threadpool(client.remove_object, config.minio_bucket, object_key)
        except S3Error as exc:
            if exc.code in {"NoSuchKey", "NoSuchObject"}:
                return
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to delete the stored file.",
            ) from exc

    async def create_object_access_url(self, object_key: str) -> str:
        client = self.get_client()
        try:
            return await run_in_threadpool(
                client.presigned_get_object,
                config.minio_bucket,
                object_key,
                expires=timedelta(seconds=config.minio_presign_expire_seconds),
            )
        except S3Error as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create file access URL.",
            ) from exc


def get_storage() -> MinioStorage:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = MinioStorage()
    return _storage_instance


def verify_required_storage_settings() -> None:
    get_storage()._verify_required_settings()


def get_minio_client() -> Minio:
    return get_storage().get_client()


async def ensure_storage_ready() -> None:
    await get_storage().ensure_ready()


async def upload_object_bytes(
    object_key: str,
    content: bytes,
    content_type: str,
) -> None:
    await get_storage().upload_object_bytes(object_key, content, content_type)


async def delete_object(object_key: str) -> None:
    await get_storage().delete_object(object_key)


async def create_object_access_url(object_key: str) -> str:
    return await get_storage().create_object_access_url(object_key)
