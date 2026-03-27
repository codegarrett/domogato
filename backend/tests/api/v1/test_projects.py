from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, User


ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"


async def _create_org(
    admin_client: AsyncClient,
    slug: str = "proj-test-org",
    name: str = "Project Test Org",
) -> dict:
    resp = await admin_client.post(ORG_API, json={"name": name, "slug": slug})
    assert resp.status_code == 201
    return resp.json()


async def _add_user_to_org(
    admin_client: AsyncClient,
    org_id: str,
    user: User,
    role: str = "member",
) -> dict:
    resp = await admin_client.post(
        f"{ORG_API}/{org_id}/members",
        json={"user_id": str(user.id), "role": role},
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_project(
    admin_client: AsyncClient,
    org_id: str,
    name: str = "Alpha Project",
    key: str = "ALPHA",
    visibility: str = "internal",
) -> dict:
    resp = await admin_client.post(
        f"{ORG_API}/{org_id}/projects",
        json={"name": name, "key": key, "visibility": visibility},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Project CRUD ----------


@pytest.mark.asyncio
async def test_create_project_as_org_admin(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="create-proj-org")
    project = await _create_project(admin_client, org["id"])
    assert project["name"] == "Alpha Project"
    assert project["key"] == "ALPHA"
    assert project["organization_id"] == org["id"]
    assert project["visibility"] == "internal"
    assert project["is_archived"] is False


@pytest.mark.asyncio
async def test_create_project_duplicate_key_rejected(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="dupkey-org")
    await _create_project(admin_client, org["id"], key="DUP")
    resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Another", "key": "DUP"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_projects(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="list-proj-org")
    await _create_project(admin_client, org["id"], name="P1", key="PA")
    await _create_project(admin_client, org["id"], name="P2", key="PB")

    resp = await admin_client.get(f"{ORG_API}/{org['id']}/projects")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    keys = {p["key"] for p in data["items"]}
    assert {"PA", "PB"} <= keys


@pytest.mark.asyncio
async def test_get_project(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="get-proj-org")
    project = await _create_project(admin_client, org["id"])

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


@pytest.mark.asyncio
async def test_update_project(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="upd-proj-org")
    project = await _create_project(admin_client, org["id"])

    resp = await admin_client.patch(
        f"{PROJECT_API}/{project['id']}",
        json={"name": "Renamed", "description": "new desc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed"
    assert data["description"] == "new desc"


@pytest.mark.asyncio
async def test_archive_project(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="archive-proj-org")
    project = await _create_project(admin_client, org["id"])

    resp = await admin_client.post(f"{PROJECT_API}/{project['id']}/archive")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}")
    assert resp.json()["is_archived"] is True


@pytest.mark.asyncio
async def test_unarchive_project(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="unarchive-proj-org")
    project = await _create_project(admin_client, org["id"])

    await admin_client.post(f"{PROJECT_API}/{project['id']}/archive")
    resp = await admin_client.post(f"{PROJECT_API}/{project['id']}/unarchive")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}")
    assert resp.json()["is_archived"] is False


# ---------- Project members ----------


@pytest.mark.asyncio
async def test_add_project_member(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, slug="add-pmem-org")
    await _add_user_to_org(admin_client, org["id"], test_user)
    project = await _create_project(admin_client, org["id"])

    resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/members",
        json={"user_id": str(test_user.id), "role": "developer"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["user_id"] == str(test_user.id)
    assert data["role"] == "developer"


@pytest.mark.asyncio
async def test_list_project_members(
    admin_client: AsyncClient,
    admin_user: User,
    test_user: User,
):
    org = await _create_org(admin_client, slug="list-pmem-org")
    await _add_user_to_org(admin_client, org["id"], test_user)
    project = await _create_project(admin_client, org["id"])

    await admin_client.post(
        f"{PROJECT_API}/{project['id']}/members",
        json={"user_id": str(test_user.id), "role": "developer"},
    )

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}/members")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2  # admin_user (owner via create) + test_user
    user_ids = {m["user_id"] for m in data["items"]}
    assert str(admin_user.id) in user_ids
    assert str(test_user.id) in user_ids


@pytest.mark.asyncio
async def test_update_project_member_role(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, slug="uprole-pmem-org")
    await _add_user_to_org(admin_client, org["id"], test_user)
    project = await _create_project(admin_client, org["id"])

    await admin_client.post(
        f"{PROJECT_API}/{project['id']}/members",
        json={"user_id": str(test_user.id), "role": "developer"},
    )

    resp = await admin_client.patch(
        f"{PROJECT_API}/{project['id']}/members/{test_user.id}",
        json={"role": "maintainer"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "maintainer"


@pytest.mark.asyncio
async def test_remove_project_member(
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, slug="rm-pmem-org")
    await _add_user_to_org(admin_client, org["id"], test_user)
    project = await _create_project(admin_client, org["id"])

    await admin_client.post(
        f"{PROJECT_API}/{project['id']}/members",
        json={"user_id": str(test_user.id), "role": "developer"},
    )

    resp = await admin_client.delete(
        f"{PROJECT_API}/{project['id']}/members/{test_user.id}"
    )
    assert resp.status_code == 204

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}/members")
    user_ids = {m["user_id"] for m in resp.json()["items"]}
    assert str(test_user.id) not in user_ids


# ---------- Visibility ----------


@pytest.mark.asyncio
async def test_project_visibility_private(
    client: AsyncClient,
    admin_client: AsyncClient,
    test_user: User,
):
    """Org member (role=member) without explicit project membership cannot access private projects."""
    org = await _create_org(admin_client, slug="vis-priv-org")
    await _add_user_to_org(admin_client, org["id"], test_user, role="member")
    project = await _create_project(
        admin_client, org["id"], name="Secret", key="SEC", visibility="private"
    )

    resp = await client.get(f"{PROJECT_API}/{project['id']}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_project_visibility_internal(
    client: AsyncClient,
    admin_client: AsyncClient,
    test_user: User,
):
    """Org member (role=member) can access internal projects as guest."""
    org = await _create_org(admin_client, slug="vis-int-org")
    await _add_user_to_org(admin_client, org["id"], test_user, role="member")
    project = await _create_project(
        admin_client, org["id"], name="Shared", key="SHR", visibility="internal"
    )

    resp = await client.get(f"{PROJECT_API}/{project['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


@pytest.mark.asyncio
async def test_non_org_member_cannot_create_project(
    client: AsyncClient,
    admin_client: AsyncClient,
):
    """Regular user who is not an org member cannot create projects in that org."""
    org = await _create_org(admin_client, slug="nocreat-org")
    resp = await client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Nope", "key": "NOPE"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_org_member_without_admin_cannot_create_project(
    client: AsyncClient,
    admin_client: AsyncClient,
    test_user: User,
):
    """Org member with 'member' role (not admin) cannot create projects."""
    org = await _create_org(admin_client, slug="memnocreat-org")
    await _add_user_to_org(admin_client, org["id"], test_user, role="member")
    resp = await client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Nope", "key": "NOPE"},
    )
    assert resp.status_code == 403
