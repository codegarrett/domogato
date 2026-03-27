from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, test_user: User):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["display_name"] == test_user.display_name
    assert data["is_system_admin"] is False


@pytest.mark.asyncio
async def test_get_me_unauthenticated(anon_client: AsyncClient):
    response = await anon_client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient):
    response = await client.patch(
        "/api/v1/users/me",
        json={"display_name": "Updated Name"},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_me_preferences(client: AsyncClient):
    response = await client.patch(
        "/api/v1/users/me",
        json={"preferences": {"theme": "dark"}},
    )
    assert response.status_code == 200
    assert response.json()["preferences"]["theme"] == "dark"


@pytest.mark.asyncio
async def test_list_users_requires_admin(client: AsyncClient):
    response = await client.get("/api/v1/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_as_admin(admin_client: AsyncClient):
    response = await admin_client.get("/api/v1/users")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
