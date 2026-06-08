"""Tests for LLM-assisted ticket and issue report content generation."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.content_assist import ContentAssistContext
from app.services.content_assist_service import (
    _extract_json,
    _normalize_generate_response,
    generate_content,
    translate_content,
)


def test_extract_json_strips_fence():
    raw = '```json\n{"title": "Fix login"}\n```'
    assert _extract_json(raw) == {"title": "Fix login"}


def test_normalize_drops_invalid_ticket_type():
    raw = {"title": "T", "ticket_type": "invalid", "priority": "high"}
    result = _normalize_generate_response(raw, ContentAssistContext.TICKET_CREATE)
    assert result["title"] == "T"
    assert result["priority"] == "high"
    assert "ticket_type" not in result


def test_normalize_issue_me_too_description_only():
    raw = {"description": "I see this too", "title": "ignored"}
    result = _normalize_generate_response(raw, ContentAssistContext.ISSUE_ME_TOO)
    assert result == {"description": "I see this too"}


@pytest.mark.asyncio
@patch("app.services.content_assist_service.is_llm_configured", return_value=False)
async def test_generate_requires_llm(_mock_configured):
    with pytest.raises(HTTPException) as exc:
        await generate_content(
            context=ContentAssistContext.TICKET_CREATE,
            prompt="Create a bug about login",
        )
    assert exc.value.status_code == 503


@pytest.mark.asyncio
@patch("app.services.content_assist_service.is_llm_configured", return_value=True)
@patch("app.services.content_assist_service.get_llm_provider")
async def test_generate_ticket_create(mock_provider_fn, _mock_configured):
    mock_provider = MagicMock()
    mock_provider.chat_completion = AsyncMock(
        return_value=MagicMock(
            content='{"title": "Login fails", "description": "## Steps\\n1. Open app", "ticket_type": "bug", "priority": "high"}',
        ),
    )
    mock_provider_fn.return_value = mock_provider

    result = await generate_content(
        context=ContentAssistContext.TICKET_CREATE,
        prompt="Users cannot log in",
    )
    assert result["title"] == "Login fails"
    assert result["ticket_type"] == "bug"
    assert result["priority"] == "high"
    assert "description" in result

    call_args = mock_provider.chat_completion.call_args
    user_msg = call_args.kwargs["messages"][1]["content"]
    assert "Users cannot log in" in user_msg


@pytest.mark.asyncio
@patch("app.services.content_assist_service.is_llm_configured", return_value=True)
@patch("app.services.content_assist_service.get_llm_provider")
async def test_generate_ticket_edit_includes_current_fields(mock_provider_fn, _mock_configured):
    mock_provider = MagicMock()
    mock_provider.chat_completion = AsyncMock(
        return_value=MagicMock(content='{"title": "Updated title", "description": "New body"}'),
    )
    mock_provider_fn.return_value = mock_provider

    await generate_content(
        context=ContentAssistContext.TICKET_EDIT,
        prompt="Add acceptance criteria",
        current_fields={"title": "Old", "description": "Old body"},
    )

    user_msg = mock_provider.chat_completion.call_args.kwargs["messages"][1]["content"]
    assert "Current fields" in user_msg
    assert "Old body" in user_msg


@pytest.mark.asyncio
@patch("app.services.content_assist_service.is_llm_configured", return_value=False)
async def test_translate_requires_llm(_mock_configured):
    with pytest.raises(HTTPException) as exc:
        await translate_content(text="Hello", target_locale="es", content_format="plain")
    assert exc.value.status_code == 503


@pytest.mark.asyncio
@patch("app.services.content_assist_service.is_llm_configured", return_value=True)
@patch("app.services.content_assist_service.get_llm_provider")
async def test_translate_returns_llm_output(mock_provider_fn, _mock_configured):
    mock_provider = MagicMock()
    mock_provider.chat_completion = AsyncMock(
        return_value=MagicMock(content="Hola"),
    )
    mock_provider_fn.return_value = mock_provider

    result = await translate_content(
        text="Hello",
        target_locale="es",
        content_format="plain",
    )
    assert result["translated_text"] == "Hola"
