"""Tests for markdown agent skill parser and validation."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.agent_skill_parser import (
    extract_json_path,
    parse_agent_skill_md,
    validate_slug,
)


VALID_SKILL = """---
tool_name: fetch_test_data
description: Fetch test data from an external API
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    limit:
      type: integer
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/data?limit={{limit}}"
  headers:
    Authorization: "Bearer {{secret:TOKEN}}"
  timeout_seconds: 10
response:
  json_path: "$.items"
---
Use when the user asks about external test data.
"""


def test_parse_valid_skill():
    parsed = parse_agent_skill_md(VALID_SKILL)
    assert parsed.tool_name == "fetch_test_data"
    assert "external test data" in parsed.description.lower()
    assert parsed.category == "integrations"
    assert parsed.min_role == "guest"
    assert parsed.request is not None
    assert parsed.request["url"].startswith("https://")
    assert parsed.response == {"json_path": "$.items"}


def test_missing_frontmatter_raises():
    with pytest.raises(HTTPException) as exc:
        parse_agent_skill_md("no frontmatter here")
    assert exc.value.status_code == 400


def test_reserved_tool_name_rejected():
    content = VALID_SKILL.replace("fetch_test_data", "calculator")
    with pytest.raises(HTTPException) as exc:
        parse_agent_skill_md(content)
    assert "reserved" in str(exc.value.detail).lower()


def test_missing_project_key_required():
    content = VALID_SKILL.replace("  required: [project_key]", "  required: []")
    with pytest.raises(HTTPException) as exc:
        parse_agent_skill_md(content)
    assert "project_key" in str(exc.value.detail)


def test_invalid_min_role():
    content = VALID_SKILL.replace("min_role: guest", "min_role: admin")
    with pytest.raises(HTTPException) as exc:
        parse_agent_skill_md(content)
    assert "min_role" in str(exc.value.detail)


def test_validate_slug():
    assert validate_slug("My-Skill_1") == "my-skill_1"
    with pytest.raises(HTTPException):
        validate_slug("ab")


def test_extract_json_path():
    data = {"items": [{"id": 1}], "meta": {"count": 1}}
    assert extract_json_path(data, "$.items") == [{"id": 1}]
    assert extract_json_path(data, "$.meta.count") == 1
    assert extract_json_path(data, "$.missing") is None
