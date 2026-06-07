"""Tests for global admin agent skill endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

SKILL_MD = """---
tool_name: global_custom_tool
description: Global custom tool
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/global"
---
Global skill.
"""


class TestAdminAgentSkillsAuth:
    @pytest.mark.asyncio
    async def test_non_admin_forbidden(self, client: AsyncClient):
        resp = await client.get("/api/v1/admin/agent-skills")
        assert resp.status_code == 403


class TestAdminAgentSkillsCrud:
    @pytest.mark.asyncio
    async def test_crud_and_secrets(self, admin_client: AsyncClient, db: AsyncSession):
        list_resp = await admin_client.get("/api/v1/admin/agent-skills")
        assert list_resp.status_code == 200
        assert list_resp.json() == []

        put_resp = await admin_client.put(
            "/api/v1/admin/agent-skills/global-skill",
            json={"name": "Global Skill", "content_md": SKILL_MD, "enabled": True},
        )
        assert put_resp.status_code == 200
        assert put_resp.json()["tool_name"] == "global_custom_tool"

        get_resp = await admin_client.get("/api/v1/admin/agent-skills/global-skill")
        assert get_resp.status_code == 200

        validate_resp = await admin_client.post(
            "/api/v1/admin/agent-skills/validate",
            json={"content_md": SKILL_MD},
        )
        assert validate_resp.status_code == 200
        assert validate_resp.json()["valid"] is True

        secret_resp = await admin_client.put(
            "/api/v1/admin/agent-skills/secrets",
            json={"key": "GLOBAL_TOKEN", "value": "secret"},
        )
        assert secret_resp.status_code == 204

        keys_resp = await admin_client.get("/api/v1/admin/agent-skills/secrets")
        assert keys_resp.status_code == 200
        assert "GLOBAL_TOKEN" in keys_resp.json()["keys"]

        del_resp = await admin_client.delete("/api/v1/admin/agent-skills/global-skill")
        assert del_resp.status_code == 204
