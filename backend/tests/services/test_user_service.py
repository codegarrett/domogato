from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.user_service import get_or_create_user, get_user_by_id, list_users


@pytest.mark.asyncio
async def test_get_or_create_user_creates_new(db_session: AsyncSession):
    claims = {
        "sub": "new-oidc-subject-123",
        "email": "newuser@example.com",
        "name": "New User",
        "realm_access": {"roles": []},
    }
    user = await get_or_create_user(db_session, claims)
    assert user.email == "newuser@example.com"
    assert user.display_name == "New User"
    assert user.is_system_admin is False
    assert user.oidc_subject == "new-oidc-subject-123"


@pytest.mark.asyncio
async def test_get_or_create_user_updates_existing(db_session: AsyncSession):
    claims = {
        "sub": "existing-oidc-subject",
        "email": "existing@example.com",
        "name": "Original Name",
        "realm_access": {"roles": []},
    }
    user = await get_or_create_user(db_session, claims)
    await db_session.flush()

    updated_claims = {
        "sub": "existing-oidc-subject",
        "email": "updated@example.com",
        "name": "Updated Name",
        "realm_access": {"roles": ["projecthub-admin"]},
    }
    updated_user = await get_or_create_user(db_session, updated_claims)
    assert updated_user.id == user.id
    assert updated_user.email == "updated@example.com"
    assert updated_user.display_name == "Updated Name"
    assert updated_user.is_system_admin is True


@pytest.mark.asyncio
async def test_get_or_create_user_detects_admin(db_session: AsyncSession):
    claims = {
        "sub": "admin-oidc-subject",
        "email": "admin@example.com",
        "name": "Admin",
        "realm_access": {"roles": ["projecthub-admin"]},
    }
    user = await get_or_create_user(db_session, claims)
    assert user.is_system_admin is True


@pytest.mark.asyncio
async def test_list_users_with_search(db_session: AsyncSession, test_user: User):
    users, total = await list_users(db_session, search=test_user.display_name[:4])
    assert total >= 1
    assert any(u.id == test_user.id for u in users)
