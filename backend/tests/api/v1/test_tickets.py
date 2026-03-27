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
WF_API = "/api/v1/workflows"


async def _setup_project_with_workflow(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    slug: str = "tkt-test-org",
) -> tuple[dict, dict, dict, dict]:
    """Create org, project, seed workflows, set default workflow. Return (org, project, workflow, initial_status)."""
    org_resp = await admin_client.post(ORG_API, json={"name": "Ticket Org", "slug": slug})
    assert org_resp.status_code == 201
    org = org_resp.json()

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Ticket Project", "key": "TK", "visibility": "internal"},
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

    return org, project, kanban, initial_status


async def _create_ticket(
    admin_client: AsyncClient,
    project_id: str,
    title: str = "Test Ticket",
    **kwargs,
) -> dict:
    payload: dict = {"title": title, **kwargs}
    resp = await admin_client.post(
        f"{PROJECT_API}/{project_id}/tickets", json=payload,
    )
    assert resp.status_code == 201
    return resp.json()


# ---------- Ticket CRUD ----------


@pytest.mark.asyncio
async def test_create_ticket(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, initial_status = await _setup_project_with_workflow(
        admin_client, db_session, slug="create-tkt-org",
    )

    ticket = await _create_ticket(
        admin_client, project["id"],
        title="First Ticket", description="A task", priority="high",
    )
    assert ticket["title"] == "First Ticket"
    assert ticket["description"] == "A task"
    assert ticket["priority"] == "high"
    assert ticket["ticket_type"] == "task"
    assert ticket["ticket_number"] == 1
    assert ticket["workflow_status_id"] == initial_status["id"]
    assert ticket["project_id"] == project["id"]
    assert ticket["is_deleted"] is False
    assert ticket["ticket_key"] == f"{project['key']}-1"


@pytest.mark.asyncio
async def test_list_tickets(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="list-tkt-org",
    )
    await _create_ticket(admin_client, project["id"], title="Ticket A")
    await _create_ticket(admin_client, project["id"], title="Ticket B")
    await _create_ticket(admin_client, project["id"], title="Ticket C")

    resp = await admin_client.get(
        f"{PROJECT_API}/{project['id']}/tickets", params={"limit": 2},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["limit"] == 2


@pytest.mark.asyncio
async def test_get_ticket(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="get-tkt-org",
    )
    ticket = await _create_ticket(admin_client, project["id"], title="Detail Ticket")

    resp = await admin_client.get(f"{TICKET_API}/{ticket['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ticket["id"]
    assert data["title"] == "Detail Ticket"
    assert data["ticket_key"] == f"{project['key']}-{ticket['ticket_number']}"


@pytest.mark.asyncio
async def test_update_ticket(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="update-tkt-org",
    )
    ticket = await _create_ticket(admin_client, project["id"], title="Old Title")

    resp = await admin_client.patch(
        f"{TICKET_API}/{ticket['id']}",
        json={"title": "New Title", "priority": "highest", "description": "Updated"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["priority"] == "highest"
    assert data["description"] == "Updated"


@pytest.mark.asyncio
async def test_transition_status(admin_client: AsyncClient, db_session: AsyncSession):
    """Transition a ticket along a valid workflow edge."""
    _, project, kanban, initial_status = await _setup_project_with_workflow(
        admin_client, db_session, slug="trans-tkt-org",
    )
    ticket = await _create_ticket(admin_client, project["id"], title="Transition Me")

    in_progress = next(
        s for s in kanban["statuses"]
        if not s["is_initial"] and not s.get("is_terminal", False)
    )

    resp = await admin_client.post(
        f"{TICKET_API}/{ticket['id']}/transition",
        json={"workflow_status_id": in_progress["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["workflow_status_id"] == in_progress["id"]


@pytest.mark.asyncio
async def test_transition_status_invalid(admin_client: AsyncClient, db_session: AsyncSession):
    """Attempt an invalid transition (skip from initial directly to terminal)."""
    _, project, kanban, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="badtrans-tkt-org",
    )
    ticket = await _create_ticket(admin_client, project["id"], title="Bad Transition")

    terminal = next(s for s in kanban["statuses"] if s.get("is_terminal", False))

    resp = await admin_client.post(
        f"{TICKET_API}/{ticket['id']}/transition",
        json={"workflow_status_id": terminal["id"]},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_nested_tickets(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="nested-tkt-org",
    )
    parent = await _create_ticket(admin_client, project["id"], title="Parent Task")
    child = await _create_ticket(
        admin_client, project["id"],
        title="Child Task", parent_ticket_id=parent["id"],
    )

    assert child["parent_ticket_id"] == parent["id"]

    resp = await admin_client.get(f"{TICKET_API}/{child['id']}")
    assert resp.status_code == 200
    assert resp.json()["parent_ticket_id"] == parent["id"]


@pytest.mark.asyncio
async def test_soft_delete_ticket(admin_client: AsyncClient, db_session: AsyncSession):
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="softdel-tkt-org",
    )
    ticket = await _create_ticket(admin_client, project["id"], title="To Delete")

    resp = await admin_client.delete(f"{TICKET_API}/{ticket['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{TICKET_API}/{ticket['id']}")
    assert resp.status_code == 200
    assert resp.json()["is_deleted"] is True


@pytest.mark.asyncio
async def test_project_auto_assigns_default_workflow(admin_client: AsyncClient):
    """Creating a project auto-assigns a default workflow, so ticket creation succeeds."""
    org_resp = await admin_client.post(
        ORG_API, json={"name": "Auto WF Org", "slug": "autowf-tkt-org"},
    )
    assert org_resp.status_code == 201
    org = org_resp.json()

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Auto WF Project", "key": "AW", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()
    assert project["default_workflow_id"] is not None

    resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Should Succeed"},
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_ticket_auto_numbering(admin_client: AsyncClient, db_session: AsyncSession):
    """Multiple tickets get sequential ticket numbers."""
    _, project, _, _ = await _setup_project_with_workflow(
        admin_client, db_session, slug="autonum-tkt-org",
    )

    numbers = []
    for i in range(1, 6):
        ticket = await _create_ticket(
            admin_client, project["id"], title=f"Ticket #{i}",
        )
        numbers.append(ticket["ticket_number"])

    assert numbers == [1, 2, 3, 4, 5]
