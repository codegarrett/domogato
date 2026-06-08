"""Tests for agent skill LLM generation helpers."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.services.agent_skill_generate_service import (
    _extract_markdown,
    _suggested_display_name,
    generate_agent_skill_md,
)
from app.services.agent_skill_parser import parse_agent_skill_md

VALID_SKILL = """---
tool_name: fetch_weather_data
description: Fetch current weather for a city
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    city:
      type: string
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/weather?city={{city}}"
---
Use when the user asks about weather.
"""


def test_extract_markdown_strips_fence():
    fenced = "```markdown\n" + VALID_SKILL + "\n```"
    assert _extract_markdown(fenced) == VALID_SKILL.strip()


def test_suggested_display_name():
    parsed = parse_agent_skill_md(VALID_SKILL)
    assert _suggested_display_name(parsed) == "Fetch weather data"


@pytest.mark.asyncio
@patch("app.services.agent_skill_generate_service.is_llm_configured", return_value=False)
async def test_generate_requires_llm(_mock_configured):
    with pytest.raises(HTTPException) as exc:
        await generate_agent_skill_md(prompt="make a weather skill")
    assert exc.value.status_code == 503


@pytest.mark.asyncio
@patch("app.services.agent_skill_generate_service.is_llm_configured", return_value=True)
@patch("app.services.agent_skill_generate_service.get_llm_provider")
async def test_generate_returns_valid_skill(mock_get_provider, _mock_configured):
    mock_provider = AsyncMock()
    mock_provider.chat_completion = AsyncMock(return_value=type(
        "R", (), {"content": VALID_SKILL}
    )())
    mock_get_provider.return_value = mock_provider

    result = await generate_agent_skill_md(prompt="weather lookup skill")
    assert result["valid"] is True
    assert result["tool_name"] == "fetch_weather_data"
    assert "fetch_weather_data" in result["content_md"]
