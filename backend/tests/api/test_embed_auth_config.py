from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_config_includes_embed_flags(client: AsyncClient):
    response = await client.get("/api/v1/auth/config")
    assert response.status_code == 200
    data = response.json()
    assert "external_agent_enabled" in data
    assert data["external_agent_enabled"] is False
    assert data["external_agent_url"] is None


@pytest.mark.asyncio
async def test_embed_config_public(client: AsyncClient):
    response = await client.get("/api/v1/auth/embed-config")
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is False
    assert data["url"] is None
    assert data["allowed_origins"] == []
