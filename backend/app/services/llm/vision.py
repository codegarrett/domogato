"""Vision / multimodal message building for LLM providers."""
from __future__ import annotations

import base64

from app.models.ai_conversation_attachment import AIConversationAttachment
from app.services.storage_service import StorageUnavailableError, get_object_bytes

IMAGE_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
})

MAX_VISION_IMAGES_PER_MESSAGE = 4


async def build_user_message_content(
    text: str,
    attachments: list[AIConversationAttachment],
    *,
    vision_enabled: bool,
    max_image_bytes: int,
    max_images: int = MAX_VISION_IMAGES_PER_MESSAGE,
) -> str | list[dict]:
    """Build OpenAI-style user message content with optional image parts."""
    if not vision_enabled or not attachments:
        return text

    image_attachments = [
        a for a in attachments
        if a.content_type in IMAGE_CONTENT_TYPES
    ]
    if not image_attachments:
        return text

    parts: list[dict] = []
    if text.strip():
        parts.append({"type": "text", "text": text})

    added = 0
    for attachment in image_attachments:
        if added >= max_images:
            break
        if attachment.size_bytes > max_image_bytes:
            continue
        try:
            stored = await get_object_bytes(attachment.s3_key)
        except StorageUnavailableError:
            continue
        encoded = base64.b64encode(stored.body).decode("ascii")
        parts.append({
            "type": "image_url",
            "image_url": {"url": f"data:{attachment.content_type};base64,{encoded}"},
        })
        added += 1

    if not parts:
        return text
    if len(parts) == 1 and parts[0].get("type") == "text":
        return text
    return parts
