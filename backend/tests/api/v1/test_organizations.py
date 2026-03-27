from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, User


API = "/api/v1/organizations"


async def _create_org(
    admin_client: AsyncClient,
    name: str = "Acme Corp",
    slug: str | None = None,
) -> dict:
    payload: dict = {"name": name}
    if slug is not None:
        payload["slug"] = slug
    resp = await admin_client.post(API, json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _add_user_to_org(
    admin_client: AsyncClient,
    org_id: str,
    user: User,
    role: str = "member",
) -> dict:
    resp = await admin_client.post(
        f"{API}/{org_id}/members",
        json={"user_id": str(user.id), "role": role},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Organization CRUD ----------


@pytest.mark.asyncio
async def test_create_organization_as_admin(admin_client: AsyncClient):
    org = await _create_org(admin_client, name="New Org")
    assert org["name"] == "New Org"
    assert org["slug"]  # slug should be auto-generated
    assert org["is_active"] is True


@pytest.mark.asyncio
async def test_create_organization_slug_generated(admin_client: AsyncClient):
    org = await _create_org(admin_client, name="My Cool Organization")
    assert org["slug"] == "my-cool-organization"


@pytest.mark.asyncio
async def test_create_organization_custom_slug(admin_client: AsyncClient):
    org = await _create_org(admin_client, name="Foo Bar", slug="custom-slug")
    assert org["slug"] == "custom-slug"


@pytest.mark.asyncio
async def test_create_organization_as_regular_user_forbidden(client: AsyncClient):
    resp = await client.post(API, json={"name": "Should Fail"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_organizations(admin_client: AsyncClient):
    await _create_org(admin_client, name="Listed Org", slug="listed-org")
    resp = await admin_client.get(API)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    slugs = [o["slug"] for o in data["items"]]
    assert "listed-org" in slugs


@pytest.mark.asyncio
async def test_get_organization(
    admin_client: AsyncClient,
):
    org = await _create_org(admin_client, name="Get Org", slug="get-org")
    resp = await admin_client.get(f"{API}/{org['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == org["id"]


@pytest.mark.asyncio
async def test_get_organization_non_member_forbidden(
    client: AsyncClient,
    admin_client: AsyncClient,
):
    org = await _create_org(admin_client, name="Secret Org", slug="secret-org")
    resp = await client.get(f"{API}/{org['id']}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_organization(admin_client: AsyncClient):
    org = await _create_org(admin_client, name="Old Name", slug="update-org")
    resp = await admin_client.patch(
        f"{API}/{org['id']}",
        json={"name": "New Name", "description": "Updated"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated"


@pytest.mark.asyncio
async def test_deactivate_organization(admin_client: AsyncClient):
    org = await _create_org(admin_client, name="Deact Org", slug="deact-org")
    resp = await admin_client.delete(f"{API}/{org['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{API}/{org['id']}")
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


# ---------- Org members ----------


@pytest.mark.asyncio
async def test_add_member(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, name="Member Org", slug="member-org")
    member = await _add_user_to_org(admin_client, org["id"], test_user, role="member")
    assert member["user_id"] == str(test_user.id)
    assert member["role"] == "member"
    assert member["email"] == test_user.email


@pytest.mark.asyncio
async def test_add_member_by_email(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, name="Email Org", slug="email-org")
    resp = await admin_client.post(
        f"{API}/{org['id']}/members",
        json={"email": test_user.email, "role": "member"},
    )
    assert resp.status_code == 201
    assert resp.json()["user_id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_list_members(
    admin_client: AsyncClient,
    admin_user: User,
    test_user: User,
):
    org = await _create_org(admin_client, name="List Members Org", slug="list-members-org")
    await _add_user_to_org(admin_client, org["id"], test_user)

    resp = await admin_client.get(f"{API}/{org['id']}/members")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2  # admin_user (owner) + test_user (member)
    user_ids = {m["user_id"] for m in data["items"]}
    assert str(admin_user.id) in user_ids
    assert str(test_user.id) in user_ids


@pytest.mark.asyncio
async def test_update_member_role(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, name="Role Org", slug="role-org")
    await _add_user_to_org(admin_client, org["id"], test_user, role="member")

    resp = await admin_client.patch(
        f"{API}/{org['id']}/members/{test_user.id}",
        json={"role": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_remove_member(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, name="Remove Org", slug="remove-org")
    await _add_user_to_org(admin_client, org["id"], test_user)

    resp = await admin_client.delete(f"{API}/{org['id']}/members/{test_user.id}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{API}/{org['id']}/members")
    user_ids = {m["user_id"] for m in resp.json()["items"]}
    assert str(test_user.id) not in user_ids


@pytest.mark.asyncio
async def test_regular_member_cannot_add_member(
    client: AsyncClient,
    admin_client: AsyncClient,
    test_user: User,
    admin_user: User,
):
    org = await _create_org(admin_client, name="Perm Org", slug="perm-org")
    await _add_user_to_org(admin_client, org["id"], test_user, role="member")

    resp = await client.post(
        f"{API}/{org['id']}/members",
        json={"user_id": str(admin_user.id), "role": "member"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_add_duplicate_member_conflict(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, name="Dup Org", slug="dup-org")
    await _add_user_to_org(admin_client, org["id"], test_user)

    resp = await admin_client.post(
        f"{API}/{org['id']}/members",
        json={"user_id": str(test_user.id), "role": "member"},
    )
    assert resp.status_code == 409
