"""Tests for accessibility platform settings API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestAccessibilitySettings:
    @pytest.mark.asyncio
    async def test_non_admin_cannot_access(self, client: AsyncClient):
        resp = await client.get("/api/v1/system-settings/accessibility")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_read_settings(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/system-settings/accessibility")
        assert resp.status_code == 200
        data = resp.json()
        assert "settings" in data
        assert data["settings"]["accessibility_enabled"]["value"] is True
        assert data["settings"]["accessibility_live_region_verbosity"]["value"] == "minimal"

    @pytest.mark.asyncio
    async def test_admin_can_update_settings(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            "/api/v1/system-settings/accessibility",
            json={
                "accessibility_keyboard_drag_alternatives": True,
                "accessibility_live_region_verbosity": "standard",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["settings"]["accessibility_keyboard_drag_alternatives"]["value"] is True
        assert data["settings"]["accessibility_live_region_verbosity"]["value"] == "standard"

    @pytest.mark.asyncio
    async def test_auth_config_includes_accessibility(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "accessibility" in data
        assert data["accessibility"]["accessibility_enabled"] is True

    @pytest.mark.asyncio
    async def test_invalid_verbosity_rejected(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            "/api/v1/system-settings/accessibility",
            json={"accessibility_live_region_verbosity": "invalid"},
        )
        assert resp.status_code == 400
