from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.user import User
from app.services.ai_service import (
    _classify_approval_response,
    _resolve_pending_approval,
)


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("Yes, go ahead", "approved"),
        ("yes", "approved"),
        ("approve", "approved"),
        ("No, cancel that", "rejected"),
        ("no", "rejected"),
        ("reject", "rejected"),
        ("maybe later", None),
    ],
)
def test_classify_approval_response(message: str, expected: str | None):
    assert _classify_approval_response(message) == expected


@pytest.mark.asyncio
async def test_resolve_pending_approval_updates_interaction(
    db_session: AsyncSession,
    test_user: User,
):
    from sqlalchemy import select

    conversation = AIConversation(user_id=test_user.id, title="Approval test")
    db_session.add(conversation)
    await db_session.flush()

    pending_content = json.dumps({
        "type": "approval",
        "status": "pending",
        "action": "Create ticket",
        "details": {"title": "Bug fix"},
    })
    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="tool",
        content=json.dumps({"status": "awaiting_user_response"}),
        tool_calls={"tool_call_id": "call_approval", "name": "request_approval"},
    ))
    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="interaction",
        content=pending_content,
    ))
    await db_session.flush()

    decided_at = datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)
    resolved = await _resolve_pending_approval(
        db_session,
        conversation.id,
        "Yes, go ahead",
        decided_at,
    )
    assert resolved is True

    msg = (await db_session.execute(
        select(AIMessage).where(
            AIMessage.conversation_id == conversation.id,
            AIMessage.role == "interaction",
        )
    )).scalar_one()
    data = json.loads(msg.content)
    assert data["status"] == "approved"
    assert data["decided_at"] == decided_at.isoformat()

    tool_msg = (await db_session.execute(
        select(AIMessage).where(
            AIMessage.conversation_id == conversation.id,
            AIMessage.role == "tool",
        )
    )).scalar_one()
    tool_data = json.loads(tool_msg.content)
    assert tool_data["status"] == "approved"
    assert tool_data["action"] == "Create ticket"


@pytest.mark.asyncio
async def test_resolve_pending_approval_rejects(
    db_session: AsyncSession,
    test_user: User,
):
    conversation = AIConversation(user_id=test_user.id, title="Reject test")
    db_session.add(conversation)
    await db_session.flush()

    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="interaction",
        content=json.dumps({
            "type": "approval",
            "status": "pending",
            "action": "Delete ticket",
            "details": {},
        }),
    ))
    await db_session.flush()

    resolved = await _resolve_pending_approval(
        db_session,
        conversation.id,
        "No, cancel that",
        datetime(2026, 6, 3, 12, 30, tzinfo=timezone.utc),
    )
    assert resolved is True

    from sqlalchemy import select

    msg = (await db_session.execute(
        select(AIMessage).where(
            AIMessage.conversation_id == conversation.id,
            AIMessage.role == "interaction",
        )
    )).scalar_one()
    data = json.loads(msg.content)
    assert data["status"] == "rejected"


@pytest.mark.asyncio
async def test_resolve_pending_approval_no_match(
    db_session: AsyncSession,
    test_user: User,
):
    conversation = AIConversation(user_id=test_user.id, title="No match")
    db_session.add(conversation)
    await db_session.flush()

    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="interaction",
        content=json.dumps({
            "type": "approval",
            "status": "pending",
            "action": "Create ticket",
            "details": {},
        }),
    ))
    await db_session.flush()

    resolved = await _resolve_pending_approval(
        db_session,
        conversation.id,
        "What are my tickets?",
        datetime.now(timezone.utc),
    )
    assert resolved is False

    from sqlalchemy import select

    msg = (await db_session.execute(
        select(AIMessage).where(
            AIMessage.conversation_id == conversation.id,
            AIMessage.role == "interaction",
        )
    )).scalar_one()
    data = json.loads(msg.content)
    assert data["status"] == "pending"
