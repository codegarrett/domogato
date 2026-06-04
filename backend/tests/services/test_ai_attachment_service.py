from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.user import User
from app.services import ai_attachment_service
from app.services.ai_attachment_service import AIAttachmentError, format_attachment_summary
from app.services.llm.vision import IMAGE_CONTENT_TYPES, build_user_message_content


@pytest.mark.asyncio
async def test_upload_and_list_attachment(
    db_session: AsyncSession, test_user: User,
):
    conv = AIConversation(user_id=test_user.id, title="Test")
    db_session.add(conv)
    await db_session.flush()

    with patch("app.services.ai_attachment_service.put_object", new_callable=AsyncMock) as mock_put:
        attachment = await ai_attachment_service.upload_conversation_attachment(
            db_session,
            conversation_id=conv.id,
            user_id=test_user.id,
            filename="screenshot.png",
            content_type="image/png",
            file_body=b"\x89PNG fake",
        )
        mock_put.assert_called_once()

    attachments = await ai_attachment_service.list_conversation_attachments(
        db_session, conv.id, test_user.id,
    )
    assert len(attachments) == 1
    assert attachments[0].id == attachment.id
    assert attachments[0].filename == "screenshot.png"


@pytest.mark.asyncio
async def test_link_attachments_to_message(
    db_session: AsyncSession, test_user: User,
):
    conv = AIConversation(user_id=test_user.id)
    db_session.add(conv)
    await db_session.flush()

    with patch("app.services.ai_attachment_service.put_object", new_callable=AsyncMock):
        attachment = await ai_attachment_service.upload_conversation_attachment(
            db_session,
            conversation_id=conv.id,
            user_id=test_user.id,
            filename="note.txt",
            content_type="text/plain",
            file_body=b"hello",
        )

    msg = AIMessage(conversation_id=conv.id, role="user", content="see attached")
    db_session.add(msg)
    await db_session.flush()

    linked = await ai_attachment_service.link_attachments_to_message(
        db_session,
        attachment_ids=[attachment.id],
        message_id=msg.id,
        conversation_id=conv.id,
        user_id=test_user.id,
    )
    assert len(linked) == 1
    assert linked[0].message_id == msg.id


@pytest.mark.asyncio
async def test_cannot_link_other_conversation_attachment(
    db_session: AsyncSession, test_user: User,
):
    conv_a = AIConversation(user_id=test_user.id)
    conv_b = AIConversation(user_id=test_user.id)
    db_session.add_all([conv_a, conv_b])
    await db_session.flush()

    with patch("app.services.ai_attachment_service.put_object", new_callable=AsyncMock):
        attachment = await ai_attachment_service.upload_conversation_attachment(
            db_session,
            conversation_id=conv_a.id,
            user_id=test_user.id,
            filename="a.txt",
            content_type="text/plain",
            file_body=b"a",
        )

    msg = AIMessage(conversation_id=conv_b.id, role="user", content="msg")
    db_session.add(msg)
    await db_session.flush()

    with pytest.raises(AIAttachmentError):
        await ai_attachment_service.link_attachments_to_message(
            db_session,
            attachment_ids=[attachment.id],
            message_id=msg.id,
            conversation_id=conv_b.id,
            user_id=test_user.id,
        )


def test_format_attachment_summary():
    class FakeAttachment:
        id = uuid.uuid4()
        filename = "shot.png"
        content_type = "image/png"

    summary = format_attachment_summary([FakeAttachment()])
    assert "shot.png" in summary
    assert "image/png" in summary


@pytest.mark.asyncio
async def test_vision_builder_text_only_when_disabled():
    class FakeAttachment:
        content_type = "image/png"
        size_bytes = 100
        s3_key = "ai-conversations/x/y.png"

    content = await build_user_message_content(
        "hello",
        [FakeAttachment()],
        vision_enabled=False,
        max_image_bytes=1024,
    )
    assert content == "hello"


@pytest.mark.asyncio
async def test_vision_builder_includes_image_part():
    class FakeAttachment:
        content_type = "image/png"
        size_bytes = 100
        s3_key = "ai-conversations/x/y.png"

    with patch(
        "app.services.llm.vision.get_object_bytes",
        new_callable=AsyncMock,
        return_value=type("Stored", (), {"body": b"pngbytes"})(),
    ):
        content = await build_user_message_content(
            "describe this",
            [FakeAttachment()],
            vision_enabled=True,
            max_image_bytes=1024,
        )

    assert isinstance(content, list)
    assert content[0]["type"] == "text"
    assert content[1]["type"] == "image_url"
    assert "base64" in content[1]["image_url"]["url"]


def test_image_content_types_subset():
    assert "image/png" in IMAGE_CONTENT_TYPES
    assert "application/pdf" not in IMAGE_CONTENT_TYPES
