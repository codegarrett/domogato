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
COMMENT_API = "/api/v1/comments"


async def _setup_ticket(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    slug: str = "cmt-test-org",
) -> tuple[dict, dict, dict]:
    """Create org, project, seed workflow, create one ticket. Return (project, ticket, initial_status)."""
    org_resp = await admin_client.post(ORG_API, json={"name": "Comment Org", "slug": slug})
    assert org_resp.status_code == 201
    org = org_resp.json()

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Comment Project", "key": "CM", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()

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

    initial_status = next(s for s in kanban["statuses"] if s["is_initial"])

    ticket_resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Commented Ticket"},
    )
    assert ticket_resp.status_code == 201
    ticket = ticket_resp.json()

    return project, ticket, initial_status


async def _create_comment(
    admin_client: AsyncClient,
    ticket_id: str,
    body: str = "A comment",
) -> dict:
    resp = await admin_client.post(
        f"{TICKET_API}/{ticket_id}/comments", json={"body": body},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Comment CRUD ----------


@pytest.mark.asyncio
async def test_create_comment(admin_client: AsyncClient, db_session: AsyncSession):
    _, ticket, _ = await _setup_ticket(admin_client, db_session, slug="create-cmt-org")

    comment = await _create_comment(admin_client, ticket["id"], body="Hello world")
    assert comment["body"] == "Hello world"
    assert comment["ticket_id"] == ticket["id"]
    assert comment["is_edited"] is False
    assert comment["is_deleted"] is False
    assert comment["author_name"] == "Admin User"


@pytest.mark.asyncio
async def test_list_comments(admin_client: AsyncClient, db_session: AsyncSession):
    _, ticket, _ = await _setup_ticket(admin_client, db_session, slug="list-cmt-org")
    await _create_comment(admin_client, ticket["id"], body="First")
    await _create_comment(admin_client, ticket["id"], body="Second")
    await _create_comment(admin_client, ticket["id"], body="Third")

    resp = await admin_client.get(f"{TICKET_API}/{ticket['id']}/comments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    bodies = [c["body"] for c in data["items"]]
    assert "First" in bodies
    assert "Second" in bodies
    assert "Third" in bodies


@pytest.mark.asyncio
async def test_update_comment(admin_client: AsyncClient, db_session: AsyncSession):
    _, ticket, _ = await _setup_ticket(admin_client, db_session, slug="update-cmt-org")
    comment = await _create_comment(admin_client, ticket["id"], body="Original")

    resp = await admin_client.patch(
        f"{COMMENT_API}/{comment['id']}",
        json={"body": "Edited"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["body"] == "Edited"
    assert data["is_edited"] is True


@pytest.mark.asyncio
async def test_delete_comment(admin_client: AsyncClient, db_session: AsyncSession):
    _, ticket, _ = await _setup_ticket(admin_client, db_session, slug="delete-cmt-org")
    comment = await _create_comment(admin_client, ticket["id"], body="To Delete")

    resp = await admin_client.delete(f"{COMMENT_API}/{comment['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{TICKET_API}/{ticket['id']}/comments")
    assert resp.status_code == 200
    data = resp.json()
    remaining_ids = [c["id"] for c in data["items"]]
    assert comment["id"] not in remaining_ids
