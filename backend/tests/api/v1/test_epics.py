from __future__ import annotations

import pytest
from httpx import AsyncClient

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"
EPIC_API = "/api/v1/epics"


async def _create_org(
    admin_client: AsyncClient,
    slug: str = "epic-test-org",
    name: str = "Epic Test Org",
) -> dict:
    resp = await admin_client.post(ORG_API, json={"name": name, "slug": slug})
    assert resp.status_code == 201
    return resp.json()


async def _create_project(
    admin_client: AsyncClient,
    org_id: str,
    name: str = "Epic Project",
    key: str = "EP",
    visibility: str = "internal",
) -> dict:
    resp = await admin_client.post(
        f"{ORG_API}/{org_id}/projects",
        json={"name": name, "key": key, "visibility": visibility},
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_epic(
    admin_client: AsyncClient,
    project_id: str,
    title: str = "Test Epic",
    **kwargs,
) -> dict:
    payload: dict = {"title": title, **kwargs}
    resp = await admin_client.post(
        f"{PROJECT_API}/{project_id}/epics", json=payload,
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Epic CRUD ----------


@pytest.mark.asyncio
async def test_create_epic(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="create-epic-org")
    project = await _create_project(admin_client, org["id"])

    epic = await _create_epic(
        admin_client,
        project["id"],
        title="My Epic",
        description="Epic description",
        color="#FF5733",
    )
    assert epic["title"] == "My Epic"
    assert epic["description"] == "Epic description"
    assert epic["color"] == "#FF5733"
    assert epic["status"] == "open"
    assert epic["project_id"] == project["id"]
    assert epic["sort_order"]


@pytest.mark.asyncio
async def test_list_epics(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="list-epic-org")
    project = await _create_project(admin_client, org["id"])
    await _create_epic(admin_client, project["id"], title="Epic A")
    await _create_epic(admin_client, project["id"], title="Epic B")

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}/epics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    titles = {e["title"] for e in data["items"]}
    assert titles == {"Epic A", "Epic B"}


@pytest.mark.asyncio
async def test_get_epic(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="get-epic-org")
    project = await _create_project(admin_client, org["id"])
    epic = await _create_epic(admin_client, project["id"], title="Detail Epic")

    resp = await admin_client.get(f"{EPIC_API}/{epic['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == epic["id"]
    assert data["title"] == "Detail Epic"


@pytest.mark.asyncio
async def test_update_epic(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="update-epic-org")
    project = await _create_project(admin_client, org["id"])
    epic = await _create_epic(admin_client, project["id"], title="Old Title")

    resp = await admin_client.patch(
        f"{EPIC_API}/{epic['id']}",
        json={"title": "New Title", "status": "in_progress", "description": "Updated"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["status"] == "in_progress"
    assert data["description"] == "Updated"


@pytest.mark.asyncio
async def test_delete_epic(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="delete-epic-org")
    project = await _create_project(admin_client, org["id"])
    epic = await _create_epic(admin_client, project["id"], title="To Delete")

    resp = await admin_client.delete(f"{EPIC_API}/{epic['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{EPIC_API}/{epic['id']}")
    assert resp.status_code == 404
