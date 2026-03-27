from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"
TICKET_API = "/api/v1/tickets"


async def _create_org_and_project(
    admin_client: AsyncClient,
    slug: str = "lbl-test-org",
) -> tuple[dict, dict]:
    """Create org and project, return (org, project)."""
    org_resp = await admin_client.post(ORG_API, json={"name": "Label Org", "slug": slug})
    assert org_resp.status_code == 201
    org = org_resp.json()

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Label Project", "key": "LB", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()

    return org, project


async def _setup_project_with_ticket(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    slug: str = "lbltkt-test-org",
) -> tuple[dict, dict, dict]:
    """Create org, project, workflow, and ticket. Return (org, project, ticket)."""
    org, project = await _create_org_and_project(admin_client, slug=slug)

    wf_resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert wf_resp.status_code == 200
    workflows = wf_resp.json()["items"]

    kanban = next(w for w in workflows if "Kanban" in w["name"])

    if project.get("default_workflow_id") != kanban["id"]:
        await db_session.execute(
            update(Project)
            .where(Project.id == uuid.UUID(project["id"]))
            .values(default_workflow_id=uuid.UUID(kanban["id"]))
        )
        await db_session.flush()

    ticket_resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Labeled Ticket"},
    )
    assert ticket_resp.status_code == 201
    ticket = ticket_resp.json()

    return org, project, ticket


async def _create_label(
    admin_client: AsyncClient,
    project_id: str,
    name: str = "bug",
    color: str = "#EF4444",
    description: str | None = None,
) -> dict:
    payload: dict = {"name": name, "color": color}
    if description is not None:
        payload["description"] = description
    resp = await admin_client.post(
        f"{PROJECT_API}/{project_id}/labels", json=payload,
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Label CRUD ----------


@pytest.mark.asyncio
async def test_create_label(admin_client: AsyncClient):
    _, project = await _create_org_and_project(admin_client, slug="create-lbl-org")

    label = await _create_label(
        admin_client, project["id"],
        name="feature", color="#22C55E", description="New feature",
    )
    assert label["name"] == "feature"
    assert label["color"] == "#22C55E"
    assert label["description"] == "New feature"
    assert label["project_id"] == project["id"]


@pytest.mark.asyncio
async def test_list_labels(admin_client: AsyncClient):
    _, project = await _create_org_and_project(admin_client, slug="list-lbl-org")
    await _create_label(admin_client, project["id"], name="bug", color="#EF4444")
    await _create_label(admin_client, project["id"], name="feature", color="#22C55E")
    await _create_label(admin_client, project["id"], name="docs", color="#3B82F6")

    resp = await admin_client.get(f"{PROJECT_API}/{project['id']}/labels")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    names = {lbl["name"] for lbl in data}
    assert names == {"bug", "feature", "docs"}


@pytest.mark.asyncio
async def test_add_label_to_ticket(
    admin_client: AsyncClient, db_session: AsyncSession,
):
    _, project, ticket = await _setup_project_with_ticket(
        admin_client, db_session, slug="addlbl-tkt-org",
    )
    label = await _create_label(admin_client, project["id"], name="urgent")

    resp = await admin_client.post(
        f"{TICKET_API}/{ticket['id']}/labels/{label['id']}",
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_list_ticket_labels(
    admin_client: AsyncClient, db_session: AsyncSession,
):
    _, project, ticket = await _setup_project_with_ticket(
        admin_client, db_session, slug="listlbl-tkt-org",
    )
    label_a = await _create_label(admin_client, project["id"], name="a")
    label_b = await _create_label(admin_client, project["id"], name="b")

    await admin_client.post(f"{TICKET_API}/{ticket['id']}/labels/{label_a['id']}")
    await admin_client.post(f"{TICKET_API}/{ticket['id']}/labels/{label_b['id']}")

    resp = await admin_client.get(f"{TICKET_API}/{ticket['id']}/labels")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = {lbl["name"] for lbl in data}
    assert names == {"a", "b"}


@pytest.mark.asyncio
async def test_remove_label_from_ticket(
    admin_client: AsyncClient, db_session: AsyncSession,
):
    _, project, ticket = await _setup_project_with_ticket(
        admin_client, db_session, slug="rmlbl-tkt-org",
    )
    label = await _create_label(admin_client, project["id"], name="wontfix")

    await admin_client.post(
        f"{TICKET_API}/{ticket['id']}/labels/{label['id']}",
    )

    resp = await admin_client.delete(
        f"{TICKET_API}/{ticket['id']}/labels/{label['id']}",
    )
    assert resp.status_code == 204
