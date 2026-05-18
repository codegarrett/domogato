"""Avatar URL helpers — uploaded avatars are served via the API, not S3 directly."""
from __future__ import annotations

from uuid import UUID

from app.core.config import settings


def is_external_avatar_url(avatar_url: str | None) -> bool:
    if not avatar_url:
        return False
    return avatar_url.startswith("http://") or avatar_url.startswith("https://")


def _is_raw_s3_avatar_key(avatar_url: str) -> bool:
    return avatar_url.startswith("users/") and "/avatar/" in avatar_url


def extract_avatar_s3_key(avatar_url: str | None) -> str | None:
    """Return the S3 object key for an uploaded avatar, if present."""
    if not avatar_url:
        return None
    if _is_raw_s3_avatar_key(avatar_url):
        return avatar_url
    bucket_marker = f"/{settings.S3_BUCKET_NAME}/"
    if bucket_marker in avatar_url and "/users/" in avatar_url and "/avatar/" in avatar_url:
        return avatar_url.split(bucket_marker, 1)[-1]
    return None


def is_stored_avatar_key(avatar_url: str | None) -> bool:
    """True when avatar_url refers to an uploaded avatar in S3."""
    return extract_avatar_s3_key(avatar_url) is not None


def user_avatar_api_path(user_id: UUID) -> str:
    return f"{settings.API_V1_PREFIX}/users/{user_id}/avatar"


def resolve_avatar_url(user_id: UUID, avatar_url: str | None) -> str | None:
    """Map stored avatar values to client-facing URLs."""
    if not avatar_url:
        return None
    if avatar_url.startswith(settings.API_V1_PREFIX):
        return avatar_url
    if extract_avatar_s3_key(avatar_url):
        return user_avatar_api_path(user_id)
    if is_external_avatar_url(avatar_url):
        return avatar_url
    return avatar_url
