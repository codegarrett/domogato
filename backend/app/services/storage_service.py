"""S3/MinIO storage service — internal object store accessed only by the API."""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import aioboto3
import structlog
from botocore.config import Config as BotoConfig

from app.core.config import settings

logger = structlog.get_logger()

_session = aioboto3.Session()

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB

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

AVATAR_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/gif", "image/webp"})


@dataclass(frozen=True)
class StoredObject:
    body: bytes
    content_type: str
    content_length: int


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


async def put_object(s3_key: str, body: bytes, content_type: str) -> None:
    try:
        async with _session.client(**_s3_kwargs()) as s3:
            await s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
                Body=body,
                ContentType=content_type,
            )
    except Exception as exc:
        await logger.aerror("s3_put_error", s3_key=s3_key, error=str(exc))
        raise StorageUnavailableError("File storage is temporarily unavailable") from exc


async def get_object_bytes(s3_key: str) -> StoredObject:
    try:
        async with _session.client(**_s3_kwargs()) as s3:
            response = await s3.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
            )
            body = await response["Body"].read()
            content_type = response.get("ContentType") or "application/octet-stream"
            return StoredObject(
                body=body,
                content_type=content_type,
                content_length=len(body),
            )
    except Exception as exc:
        await logger.aerror("s3_get_error", s3_key=s3_key, error=str(exc))
        raise StorageUnavailableError("File storage is temporarily unavailable") from exc


async def iter_object_chunks(s3_key: str, chunk_size: int = 64 * 1024) -> AsyncIterator[bytes]:
    """Stream an object from S3 in chunks."""
    async with _session.client(**_s3_kwargs()) as s3:
        response = await s3.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
        )
        stream = response["Body"]
        while True:
            chunk = await stream.read(chunk_size)
            if not chunk:
                break
            yield chunk


async def get_object_content_type(s3_key: str) -> str:
    try:
        async with _session.client(**_s3_kwargs()) as s3:
            response = await s3.head_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
            )
            return response.get("ContentType") or "application/octet-stream"
    except Exception as exc:
        await logger.aerror("s3_head_error", s3_key=s3_key, error=str(exc))
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
