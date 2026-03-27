"""S3/MinIO storage service for file uploads and downloads using presigned URLs."""
from __future__ import annotations

import uuid
from typing import Any

import aioboto3
import structlog
from botocore.config import Config as BotoConfig

from app.core.config import settings

logger = structlog.get_logger()

_session = aioboto3.Session()

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

ALLOWED_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/zip",
    "application/gzip",
    "application/x-tar",
    "video/mp4",
    "audio/mpeg",
})


def _s3_kwargs() -> dict[str, Any]:
    return {
        "service_name": "s3",
        "endpoint_url": settings.S3_ENDPOINT_URL,
        "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
        "config": BotoConfig(signature_version="s3v4"),
    }


def generate_s3_key(project_id: str, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    unique = uuid.uuid4().hex[:12]
    return f"projects/{project_id}/attachments/{unique}_{safe_name}"


def generate_avatar_s3_key(user_id: str, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    unique = uuid.uuid4().hex[:12]
    return f"users/{user_id}/avatar/{unique}_{safe_name}"


class StorageUnavailableError(Exception):
    """Raised when S3/MinIO storage is not reachable."""


async def generate_upload_presign(
    s3_key: str,
    content_type: str,
    expiry: int | None = None,
) -> str:
    try:
        async with _session.client(**_s3_kwargs()) as s3:
            url = await s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiry or settings.S3_PRESIGN_EXPIRY,
            )
        return url
    except Exception as exc:
        await logger.aerror("s3_upload_presign_error", s3_key=s3_key, error=str(exc))
        raise StorageUnavailableError("File storage is temporarily unavailable") from exc


async def generate_download_presign(
    s3_key: str,
    filename: str | None = None,
    expiry: int | None = None,
) -> str:
    params: dict[str, Any] = {
        "Bucket": settings.S3_BUCKET_NAME,
        "Key": s3_key,
    }
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

    try:
        async with _session.client(**_s3_kwargs()) as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expiry or settings.S3_PRESIGN_EXPIRY,
            )
        return url
    except Exception as exc:
        await logger.aerror("s3_download_presign_error", s3_key=s3_key, error=str(exc))
        raise StorageUnavailableError("File storage is temporarily unavailable") from exc


async def delete_object(s3_key: str) -> None:
    try:
        async with _session.client(**_s3_kwargs()) as s3:
            await s3.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
            )
    except Exception:
        await logger.awarning("s3_delete_error", s3_key=s3_key)
