"""Tests for local authentication, registration, and password change."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.password import hash_password
from app.models.user import User
from tests.conftest import create_test_app, make_fake_user


@pytest_asyncio.fixture
async def local_user(db_session: AsyncSession) -> User:
    """Create a user with a password hash for local auth testing."""
    user = User(
        oidc_subject="local:test-local-user",
        email="local@example.com",
        display_name="Local User",
        password_hash=hash_password("TestPass1"),
        is_system_admin=False,
        is_active=True,
        preferences={},
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def local_admin(db_session: AsyncSession) -> User:
    """Create a local admin user."""
    user = User(
        oidc_subject="local:test-local-admin",
        email="localadmin@example.com",
        display_name="Local Admin",
        password_hash=hash_password("AdminPass1"),
        is_system_admin=True,
        is_active=True,
        preferences={},
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def noauth_client(db_session: AsyncSession) -> AsyncClient:
    """Client without any auth override so real auth endpoints can be tested."""
    app = create_test_app(db_override=db_session)
    if hasattr(app, 'dependency_overrides'):
        from app.api.deps import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestAuthConfig:
    @pytest.mark.asyncio
    async def test_get_auth_config(self, noauth_client: AsyncClient):
        resp = await noauth_client.get("/api/v1/auth/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "auth_mode" in data
        assert "needs_setup" in data
        assert "local_registration_enabled" in data


class TestLocalLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, noauth_client: AsyncClient, local_user: User):
        resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "TestPass1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "local@example.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, noauth_client: AsyncClient, local_user: User):
        resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "WrongPass1",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, noauth_client: AsyncClient):
        resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "noone@example.com",
            "password": "TestPass1",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, noauth_client: AsyncClient, db_session: AsyncSession):
        user = User(
            oidc_subject="local:inactive-user",
            email="inactive@example.com",
            display_name="Inactive",
            password_hash=hash_password("TestPass1"),
            is_system_admin=False,
            is_active=False,
            preferences={},
        )
        db_session.add(user)
        await db_session.flush()

        resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "inactive@example.com",
            "password": "TestPass1",
        })
        assert resp.status_code == 403


class TestLocalJwtValidation:
    @pytest.mark.asyncio
    async def test_local_jwt_accepted_by_protected_endpoint(
        self, noauth_client: AsyncClient, local_user: User
    ):
        login_resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "TestPass1",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        resp = await noauth_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "local@example.com"


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_change_password(self, noauth_client: AsyncClient, local_user: User):
        login_resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "TestPass1",
        })
        token = login_resp.json()["access_token"]

        resp = await noauth_client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "TestPass1", "new_password": "NewPass2"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        resp2 = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "NewPass2",
        })
        assert resp2.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, noauth_client: AsyncClient, local_user: User):
        login_resp = await noauth_client.post("/api/v1/auth/login", json={
            "email": "local@example.com",
            "password": "TestPass1",
        })
        token = login_resp.json()["access_token"]

        resp = await noauth_client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "WrongCurrent1", "new_password": "NewPass2"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
