from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.user import User
from app.services.ai_service import (
    _match_choice_option,
    _resolve_pending_choice,
)


@pytest.mark.parametrize(
    ("message", "options", "expected"),
    [
        ("Project A", ["Project A", "Project B"], "Project A"),
        ("project a", ["Project A", "Project B"], "Project A"),
        ("  Project B  ", ["Project A", "Project B"], "Project B"),
        ("Unknown", ["Project A", "Project B"], None),
        ("", ["Project A"], None),
    ],
)
def test_match_choice_option(message: str, options: list[str], expected: str | None):
    assert _match_choice_option(message, options) == expected


@pytest.mark.asyncio
async def test_resolve_pending_choice_updates_interaction(
    db_session: AsyncSession,
    test_user: User,
):
    from sqlalchemy import select

    conversation = AIConversation(user_id=test_user.id, title="Choice test")
    db_session.add(conversation)
    await db_session.flush()

    pending_content = json.dumps({
        "type": "choice",
        "status": "pending",
        "question": "Which project?",
        "options": ["Legal", "IT"],
    })
    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="interaction",
        content=pending_content,
    ))
    await db_session.flush()

    decided_at = datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)
    resolved = await _resolve_pending_choice(
        db_session,
        conversation.id,
        "legal",
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
    assert data["status"] == "answered"
    assert data["selected_option"] == "Legal"
    assert data["decided_at"] == decided_at.isoformat()


@pytest.mark.asyncio
async def test_resolve_pending_choice_custom_answer(
    db_session: AsyncSession,
    test_user: User,
):
    from sqlalchemy import select

    conversation = AIConversation(user_id=test_user.id, title="Choice other")
    db_session.add(conversation)
    await db_session.flush()

    db_session.add(AIMessage(
        conversation_id=conversation.id,
        role="interaction",
        content=json.dumps({
            "type": "choice",
            "status": "pending",
            "question": "Which project?",
            "options": ["Legal", "IT"],
        }),
    ))
    await db_session.flush()

    resolved = await _resolve_pending_choice(
        db_session,
        conversation.id,
        "Finance team project",
        datetime(2026, 6, 3, 12, 30, tzinfo=timezone.utc),
    )
    assert resolved is True

    msg = (await db_session.execute(
        select(AIMessage).where(
            AIMessage.conversation_id == conversation.id,
            AIMessage.role == "interaction",
        )
    )).scalar_one()
    data = json.loads(msg.content)
    assert data["status"] == "answered"
    assert data["selected_option"] == "Finance team project"


@pytest.mark.asyncio
async def test_resolve_pending_choice_no_pending(
    db_session: AsyncSession,
    test_user: User,
):
    conversation = AIConversation(user_id=test_user.id, title="No choice")
    db_session.add(conversation)
    await db_session.flush()

    resolved = await _resolve_pending_choice(
        db_session,
        conversation.id,
        "Legal",
        datetime.now(timezone.utc),
    )
    assert resolved is False
