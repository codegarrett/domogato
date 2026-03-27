"""Tests for the setup wizard endpoints."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.password import hash_password
from app.models.user import User
from tests.conftest import create_test_app


@pytest_asyncio.fixture
async def setup_client(db_session: AsyncSession) -> AsyncClient:
    """Client without auth overrides for setup testing."""
    app = create_test_app(db_override=db_session)
    from app.api.deps import get_current_user
    app.dependency_overrides.pop(get_current_user, None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestSetupStatus:
    @pytest.mark.asyncio
    async def test_needs_setup_when_no_admin(self, setup_client: AsyncClient):
        resp = await setup_client.get("/api/v1/setup/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["needs_setup"] is True

    @pytest.mark.asyncio
    async def test_no_setup_needed_when_admin_exists(
        self, setup_client: AsyncClient, db_session: AsyncSession
    ):
        admin = User(
            oidc_subject="local:existing-admin",
            email="existing-admin@example.com",
            display_name="Existing Admin",
            password_hash=hash_password("AdminPass1"),
            is_system_admin=True,
            is_active=True,
            preferences={},
        )
        db_session.add(admin)
        await db_session.flush()

        resp = await setup_client.get("/api/v1/setup/status")
        assert resp.status_code == 200
        assert resp.json()["needs_setup"] is False


class TestSetupInitialize:
    @pytest.mark.asyncio
    async def test_initialize_creates_admin(self, setup_client: AsyncClient):
        resp = await setup_client.post("/api/v1/setup/initialize", json={
            "email": "newadmin@example.com",
            "password": "AdminPass1",
            "display_name": "New Admin",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["is_system_admin"] is True
        assert data["user"]["email"] == "newadmin@example.com"

    @pytest.mark.asyncio
    async def test_initialize_idempotent_fails(self, setup_client: AsyncClient):
        resp1 = await setup_client.post("/api/v1/setup/initialize", json={
            "email": "admin1@example.com",
            "password": "AdminPass1",
            "display_name": "Admin 1",
        })
        assert resp1.status_code == 201

        resp2 = await setup_client.post("/api/v1/setup/initialize", json={
            "email": "admin2@example.com",
            "password": "AdminPass2",
            "display_name": "Admin 2",
        })
        assert resp2.status_code == 409

    @pytest.mark.asyncio
    async def test_initialize_weak_password(self, setup_client: AsyncClient):
        resp = await setup_client.post("/api/v1/setup/initialize", json={
            "email": "admin@example.com",
            "password": "weak",
            "display_name": "Admin",
        })
        assert resp.status_code == 400


class TestSetupWithConfig:
    @pytest.mark.asyncio
    async def test_auth_config_reflects_setup(self, setup_client: AsyncClient):
        config_resp = await setup_client.get("/api/v1/auth/config")
        assert config_resp.json()["needs_setup"] is True

        await setup_client.post("/api/v1/setup/initialize", json={
            "email": "admin@example.com",
            "password": "AdminPass1",
            "display_name": "Admin",
        })

        config_resp2 = await setup_client.get("/api/v1/auth/config")
        assert config_resp2.json()["needs_setup"] is False
