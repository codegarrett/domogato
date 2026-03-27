from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Organization,
    OrgMembership,
    Project,
    ProjectMembership,
    Ticket,
    User,
    Workflow,
    WorkflowStatus,
)
from tests.conftest import create_test_app


@pytest_asyncio.fixture
async def member_client(
    db_session: AsyncSession,
    test_user: User,
    test_org: Organization,
    test_project: Project,
) -> AsyncClient:
    db_session.add(
        OrgMembership(user_id=test_user.id, organization_id=test_org.id, role="member")
    )
    db_session.add(
        ProjectMembership(user_id=test_user.id, project_id=test_project.id, role="developer")
    )
    await db_session.flush()
    app = create_test_app(current_user=test_user, db_override=db_session)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _setup_workflow(db: AsyncSession, org: Organization, project: Project):
    wf = Workflow(organization_id=org.id, name="TestWF")
    db.add(wf)
    await db.flush()
    s1 = WorkflowStatus(workflow_id=wf.id, name="Todo", category="todo", position=0, color="#ccc")
    db.add(s1)
    await db.flush()
    project.default_workflow_id = wf.id
    await db.flush()
    return s1


async def _create_space(client: AsyncClient, project_id, name: str = "Story Space") -> dict:
    resp = await client.post(f"/api/v1/projects/{project_id}/kb/spaces", json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_user_story_page(client: AsyncClient, space_id: str) -> dict:
    resp = await client.post(
        f"/api/v1/kb/spaces/{space_id}/pages",
        json={
            "title": "My User Story",
            "content_markdown": "# User Story",
            "page_type": "user_story",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Story Workflows
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestStoryWorkflows:
    async def test_get_or_create_workflow(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == str(test_project.id)
        assert len(data["statuses"]) == 4
        names = [s["name"] for s in data["statuses"]]
        assert "Draft" in names
        assert "Ticketed" in names

    async def test_create_status(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow/statuses",
            json={"name": "Custom Status", "category": "review", "color": "#FF0000", "position": 5},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Custom Status"
        assert data["color"] == "#FF0000"

    async def test_update_status(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow"
        )
        statuses = resp.json()["statuses"]
        sid = statuses[0]["id"]

        resp = await admin_client.patch(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow/statuses/{sid}",
            json={"name": "Renamed Status"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Status"

    async def test_delete_unused_status(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow/statuses",
            json={"name": "Temp Status", "category": "draft"},
        )
        sid = resp.json()["id"]
        resp = await admin_client.delete(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow/statuses/{sid}"
        )
        assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Page Meta & Template-aware Page Creation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestPageMeta:
    async def test_create_user_story_page_sets_meta(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])
        assert page["meta"] is not None
        assert page["meta"]["page_type"] == "user_story"
        assert page["meta"]["story_status"] is not None
        assert page["meta"]["story_status"]["name"] == "Draft"

    async def test_regular_page_has_no_meta(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/spaces/{space['id']}/pages",
            json={"title": "Regular Page"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["meta"] is None

    async def test_get_page_meta(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        resp = await admin_client.get(f"/api/v1/kb/pages/{page['id']}/meta")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page_type"] == "user_story"

    async def test_update_story_status(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        wf_resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/story-workflow"
        )
        statuses = wf_resp.json()["statuses"]
        ticketed = next(s for s in statuses if s["name"] == "Ticketed")

        resp = await admin_client.patch(
            f"/api/v1/kb/pages/{page['id']}/meta",
            json={"story_workflow_status_id": ticketed["id"]},
        )
        assert resp.status_code == 200
        assert resp.json()["story_workflow_status_id"] == ticketed["id"]


# ---------------------------------------------------------------------------
# Ticket Links
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestTicketLinks:
    async def test_link_and_list_tickets(
        self,
        admin_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        ws = await _setup_workflow(db_session, test_org, test_project)
        t = Ticket(
            project_id=test_project.id,
            title="Linked Ticket",
            ticket_number=42,
            workflow_status_id=ws.id,
            priority="high",
        )
        db_session.add(t)
        await db_session.flush()

        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/ticket-links",
            json={"ticket_id": str(t.id)},
        )
        assert resp.status_code == 201
        link = resp.json()
        assert link["ticket_id"] == str(t.id)
        assert link["ticket_title"] == "Linked Ticket"

        resp = await admin_client.get(
            f"/api/v1/kb/pages/{page['id']}/ticket-links"
        )
        assert resp.status_code == 200
        links = resp.json()
        assert len(links) == 1

    async def test_duplicate_link_rejected(
        self,
        admin_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        ws = await _setup_workflow(db_session, test_org, test_project)
        t = Ticket(
            project_id=test_project.id,
            title="Dup Ticket",
            ticket_number=99,
            workflow_status_id=ws.id,
        )
        db_session.add(t)
        await db_session.flush()

        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/ticket-links",
            json={"ticket_id": str(t.id)},
        )
        assert resp.status_code == 201

        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/ticket-links",
            json={"ticket_id": str(t.id)},
        )
        assert resp.status_code == 409

    async def test_delete_ticket_link(
        self,
        admin_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        ws = await _setup_workflow(db_session, test_org, test_project)
        t = Ticket(
            project_id=test_project.id,
            title="Del Ticket",
            ticket_number=77,
            workflow_status_id=ws.id,
        )
        db_session.add(t)
        await db_session.flush()

        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/ticket-links",
            json={"ticket_id": str(t.id)},
        )
        link_id = resp.json()["id"]

        resp = await admin_client.delete(
            f"/api/v1/kb/pages/{page['id']}/ticket-links/{link_id}"
        )
        assert resp.status_code == 204

        resp = await admin_client.get(
            f"/api/v1/kb/pages/{page['id']}/ticket-links"
        )
        assert len(resp.json()) == 0


# ---------------------------------------------------------------------------
# Reverse Lookup
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestReverseTicketLookup:
    async def test_get_user_stories_for_ticket(
        self,
        admin_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        ws = await _setup_workflow(db_session, test_org, test_project)
        t = Ticket(
            project_id=test_project.id,
            title="Rev Ticket",
            ticket_number=55,
            workflow_status_id=ws.id,
        )
        db_session.add(t)
        await db_session.flush()

        space = await _create_space(admin_client, test_project.id)
        page = await _create_user_story_page(admin_client, space["id"])

        await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/ticket-links",
            json={"ticket_id": str(t.id)},
        )

        resp = await admin_client.get(f"/api/v1/tickets/{t.id}/user-stories")
        assert resp.status_code == 200
        stories = resp.json()
        assert len(stories) == 1
        assert stories[0]["page_title"] == "My User Story"
        assert stories[0]["story_status_name"] == "Draft"

    async def test_no_stories_for_unlinked_ticket(
        self,
        admin_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        ws = await _setup_workflow(db_session, test_org, test_project)
        t = Ticket(
            project_id=test_project.id,
            title="Solo Ticket",
            ticket_number=66,
            workflow_status_id=ws.id,
        )
        db_session.add(t)
        await db_session.flush()

        resp = await admin_client.get(f"/api/v1/tickets/{t.id}/user-stories")
        assert resp.status_code == 200
        assert len(resp.json()) == 0
