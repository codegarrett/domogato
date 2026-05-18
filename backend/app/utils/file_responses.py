"""Helpers for streaming stored files to HTTP clients."""
from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import quote

from fastapi.responses import StreamingResponse

from app.services.storage_service import StorageUnavailableError, iter_object_chunks


def build_content_disposition(filename: str | None, *, inline: bool = False) -> str | None:
    if not filename:
        return None
    disposition = "inline" if inline else "attachment"
    encoded = quote(filename)
    return f'{disposition}; filename="{filename}"; filename*=UTF-8\'\'{encoded}'


def stored_object_response(
    *,
    body: bytes,
    content_type: str,
    filename: str | None = None,
    inline: bool = False,
) -> StreamingResponse:
    headers: dict[str, str] = {}
    disposition = build_content_disposition(filename, inline=inline)
    if disposition:
        headers["Content-Disposition"] = disposition
    headers["Content-Length"] = str(len(body))
    return StreamingResponse(iter([body]), media_type=content_type, headers=headers)


async def streaming_s3_response(
    s3_key: str,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    inline: bool = False,
) -> StreamingResponse:
    if content_type is None:
        from app.services.storage_service import get_object_content_type

        content_type = await get_object_content_type(s3_key)

    headers: dict[str, str] = {}
    disposition = build_content_disposition(filename, inline=inline)
    if disposition:
        headers["Content-Disposition"] = disposition

    async def _stream() -> AsyncIterator[bytes]:
        try:
            async for chunk in iter_object_chunks(s3_key):
                yield chunk
        except StorageUnavailableError:
            raise

    return StreamingResponse(_stream(), media_type=content_type, headers=headers)
