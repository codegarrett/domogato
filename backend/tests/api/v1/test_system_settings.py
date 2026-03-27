"""Tests for system settings endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestSystemSettingsAuth:
    @pytest.mark.asyncio
    async def test_non_admin_cannot_access(self, client: AsyncClient):
        resp = await client.get("/api/v1/system-settings/auth")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_read_settings(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/system-settings/auth")
        assert resp.status_code == 200
        data = resp.json()
        assert "settings" in data
        settings = data["settings"]
        assert "auth_mode" in settings
        assert "oidc_auto_provision" in settings
        assert settings["auth_mode"]["value"] in ("local", "oidc")

    @pytest.mark.asyncio
    async def test_admin_can_update_settings(self, admin_client: AsyncClient):
        resp = await admin_client.put("/api/v1/system-settings/auth", json={
            "oidc_auto_provision": False,
            "oidc_allowed_domains": ["example.com"],
        })
        assert resp.status_code == 200
        settings = resp.json()["settings"]
        assert settings["oidc_auto_provision"]["value"] is False
        assert settings["oidc_allowed_domains"]["value"] == ["example.com"]

    @pytest.mark.asyncio
    async def test_invalid_auth_mode(self, admin_client: AsyncClient):
        resp = await admin_client.put("/api/v1/system-settings/auth", json={
            "auth_mode": "invalid",
        })
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_source_annotation(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/system-settings/auth")
        settings = resp.json()["settings"]
        for key, entry in settings.items():
            assert "value" in entry
            assert "source" in entry
            assert entry["source"] in ("env", "database", "default")
            assert "env_locked" in entry

    @pytest.mark.asyncio
    async def test_oidc_secret_masked(self, admin_client: AsyncClient):
        await admin_client.put("/api/v1/system-settings/auth", json={
            "oidc_client_secret": "super-secret-value",
        })
        resp = await admin_client.get("/api/v1/system-settings/auth")
        secret = resp.json()["settings"]["oidc_client_secret"]
        assert secret["value"] == "****"
