"""Tests for ticket dependency endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"


async def _setup_two_tickets(admin_client: AsyncClient) -> tuple[str, str, str]:
    """Create org, project, and two tickets. Return (project_id, ticket1_id, ticket2_id)."""
    org_resp = await admin_client.post(
        ORG_API, json={"name": "Dep Org", "slug": "dep-org"},
    )
    assert org_resp.status_code == 201
    org = org_resp.json()

    wf_resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    workflows = wf_resp.json()["items"]
    kanban = next(w for w in workflows if "Kanban" in w["name"])

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Dep Project", "key": "DEPJ", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()

    if not project.get("default_workflow_id"):
        await admin_client.patch(
            f"{PROJECT_API}/{project['id']}",
            json={"default_workflow_id": kanban["id"]},
        )

    t1 = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Ticket A"},
    )
    assert t1.status_code == 201

    t2 = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Ticket B"},
    )
    assert t2.status_code == 201

    return project["id"], t1.json()["id"], t2.json()["id"]


@pytest.mark.asyncio
async def test_create_dependency_blocks(admin_client: AsyncClient):
    _, t1_id, t2_id = await _setup_two_tickets(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "blocks"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["blocking_ticket_id"] == t1_id
    assert data["blocked_ticket_id"] == t2_id
    assert data["dependency_type"] == "blocks"


@pytest.mark.asyncio
async def test_create_dependency_blocked_by(admin_client: AsyncClient):
    _, t1_id, t2_id = await _setup_two_tickets(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "blocked_by"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["blocking_ticket_id"] == t2_id
    assert data["blocked_ticket_id"] == t1_id


@pytest.mark.asyncio
async def test_create_dependency_self_fails(admin_client: AsyncClient):
    _, t1_id, _ = await _setup_two_tickets(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t1_id, "dependency_type": "blocks"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_dependency_duplicate_fails(admin_client: AsyncClient):
    _, t1_id, t2_id = await _setup_two_tickets(admin_client)

    resp1 = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "blocks"},
    )
    assert resp1.status_code == 201

    resp2 = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "blocks"},
    )
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_list_dependencies(admin_client: AsyncClient):
    _, t1_id, t2_id = await _setup_two_tickets(admin_client)

    await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "blocks"},
    )

    resp = await admin_client.get(f"/api/v1/tickets/{t1_id}/dependencies")
    assert resp.status_code == 200
    deps = resp.json()
    assert len(deps) == 1
    assert deps[0]["blocking_ticket_title"] == "Ticket A"
    assert deps[0]["blocked_ticket_title"] == "Ticket B"


@pytest.mark.asyncio
async def test_delete_dependency(admin_client: AsyncClient):
    _, t1_id, t2_id = await _setup_two_tickets(admin_client)

    create_resp = await admin_client.post(
        f"/api/v1/tickets/{t1_id}/dependencies",
        json={"blocked_ticket_id": t2_id, "dependency_type": "relates_to"},
    )
    assert create_resp.status_code == 201
    dep_id = create_resp.json()["id"]

    del_resp = await admin_client.delete(f"/api/v1/dependencies/{dep_id}")
    assert del_resp.status_code == 204

    list_resp = await admin_client.get(f"/api/v1/tickets/{t1_id}/dependencies")
    assert len(list_resp.json()) == 0
