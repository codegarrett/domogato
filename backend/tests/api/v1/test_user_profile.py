from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_avatar_upload_request(client: AsyncClient):
    response = await client.post(
        "/api/v1/users/me/avatar",
        json={"filename": "photo.jpg", "content_type": "image/jpeg"},
    )
    assert response.status_code in (201, 503)
    if response.status_code == 201:
        data = response.json()
        assert "upload_url" in data
        assert "avatar_key" in data
        assert "avatar/" in data["avatar_key"]


@pytest.mark.asyncio
async def test_avatar_upload_invalid_type(client: AsyncClient):
    response = await client.post(
        "/api/v1/users/me/avatar",
        json={"filename": "doc.pdf", "content_type": "application/pdf"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_avatar_confirm_wrong_key(client: AsyncClient):
    response = await client.post(
        "/api/v1/users/me/avatar/confirm",
        json={"avatar_key": "users/wrong-id/avatar/test.jpg"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_avatar_delete_no_avatar(client: AsyncClient):
    response = await client.delete("/api/v1/users/me/avatar")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_update_preferences(client: AsyncClient):
    response = await client.patch(
        "/api/v1/users/me",
        json={
            "preferences": {
                "locale": "es",
                "darkMode": True,
                "notifications": {"email": False, "sound": True},
            }
        },
    )
    assert response.status_code == 200
    prefs = response.json()["preferences"]
    assert prefs["locale"] == "es"
    assert prefs["darkMode"] is True
    assert prefs["notifications"]["email"] is False


@pytest.mark.asyncio
async def test_update_display_name(client: AsyncClient):
    response = await client.patch(
        "/api/v1/users/me",
        json={"display_name": "New Display Name"},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "New Display Name"


@pytest.mark.asyncio
async def test_account_url(client: AsyncClient):
    response = await client.get("/api/v1/auth/account-url")
    assert response.status_code == 200
    data = response.json()
    assert "account_url" in data
    assert "security_url" in data
    assert "password_url" in data
    assert "sessions_url" in data
    assert "/account" in data["account_url"]


@pytest.mark.asyncio
async def test_account_url_unauthenticated(anon_client: AsyncClient):
    response = await anon_client.get("/api/v1/auth/account-url")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_list_users(admin_client: AsyncClient, test_user: User):
    response = await admin_client.get("/api/v1/users")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    emails = [u["email"] for u in data["items"]]
    assert any("admin@example.com" in e for e in emails)


@pytest.mark.asyncio
async def test_admin_list_users_search(admin_client: AsyncClient, test_user: User):
    response = await admin_client.get("/api/v1/users", params={"q": "admin"})
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert "admin" in item["email"].lower() or "admin" in item["display_name"].lower()


@pytest.mark.asyncio
async def test_admin_toggle_active(admin_client: AsyncClient, test_user: User):
    response = await admin_client.patch(
        f"/api/v1/users/{test_user.id}",
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    response = await admin_client.patch(
        f"/api/v1/users/{test_user.id}",
        json={"is_active": True},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is True


@pytest.mark.asyncio
async def test_admin_toggle_system_admin(admin_client: AsyncClient, test_user: User):
    response = await admin_client.patch(
        f"/api/v1/users/{test_user.id}",
        json={"is_system_admin": True},
    )
    assert response.status_code == 200
    assert response.json()["is_system_admin"] is True

    response = await admin_client.patch(
        f"/api/v1/users/{test_user.id}",
        json={"is_system_admin": False},
    )
    assert response.status_code == 200
    assert response.json()["is_system_admin"] is False


@pytest.mark.asyncio
async def test_non_admin_cannot_list_users(client: AsyncClient):
    response = await client.get("/api/v1/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_update_other_users(client: AsyncClient, admin_user: User):
    response = await client.patch(
        f"/api/v1/users/{admin_user.id}",
        json={"is_active": False},
    )
    assert response.status_code == 403
