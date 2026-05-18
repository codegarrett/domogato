"""Client-facing URLs for stored files (always API paths, never S3/MinIO)."""
from __future__ import annotations

import re
from uuid import UUID

from app.core.config import settings


def ticket_attachment_download_path(attachment_id: UUID) -> str:
    return f"{settings.API_V1_PREFIX}/attachments/{attachment_id}/download"


def issue_report_attachment_download_path(attachment_id: UUID) -> str:
    return f"{settings.API_V1_PREFIX}/issue-report-attachments/{attachment_id}/download"


def kb_attachment_download_path(attachment_id: UUID) -> str:
    return f"{settings.API_V1_PREFIX}/kb/attachments/{attachment_id}/download"


def _legacy_s3_url_pattern() -> re.Pattern[str]:
  bucket = re.escape(settings.S3_BUCKET_NAME)
  endpoint = re.escape(settings.S3_ENDPOINT_URL.rstrip("/"))
  return re.compile(
      rf"https?://{endpoint}/{bucket}/([^\s\"'<>]+)|"
      rf"https?://minio:\d+/{bucket}/([^\s\"'<>]+)",
      re.IGNORECASE,
  )


def rewrite_legacy_s3_urls(text: str | None, s3_key_to_path: dict[str, str]) -> str | None:
    """Replace legacy MinIO/S3 URLs in free text with API download paths where keys match."""
    if not text:
        return text

    def _replace(match: re.Match[str]) -> str:
        key = match.group(1) or match.group(2)
        if key in s3_key_to_path:
            return s3_key_to_path[key]
        return match.group(0)

    return _legacy_s3_url_pattern().sub(_replace, text)
