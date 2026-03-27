from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Ticket
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus


pytestmark = pytest.mark.asyncio


async def _create_workflow_with_statuses(
    db: AsyncSession, org_id, project: Project
) -> tuple[WorkflowStatus, WorkflowStatus]:
    wf = Workflow(
        organization_id=org_id, name="WF", is_active=True,
    )
    db.add(wf)
    await db.flush()

    open_s = WorkflowStatus(
        workflow_id=wf.id, name="Open", category="todo",
        is_initial=True, is_terminal=False, position=0,
    )
    done_s = WorkflowStatus(
        workflow_id=wf.id, name="Done", category="done",
        is_initial=False, is_terminal=True, position=1,
    )
    db.add_all([open_s, done_s])
    await db.flush()

    project.default_workflow_id = wf.id
    await db.flush()
    return open_s, done_s


class TestSprintCRUD:
    async def test_create_sprint(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint 1", "goal": "Ship it"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Sprint 1"
        assert data["status"] == "planning"

    async def test_list_sprints(self, admin_client: AsyncClient, test_project: Project):
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint A"},
        )
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint B"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/sprints"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2

    async def test_update_sprint(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Old Name"},
        )
        sid = create.json()["id"]
        resp = await admin_client.patch(
            f"/api/v1/sprints/{sid}",
            json={"name": "New Name", "goal": "Updated goal"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    async def test_delete_sprint(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Delete Me"},
        )
        sid = create.json()["id"]
        resp = await admin_client.delete(f"/api/v1/sprints/{sid}")
        assert resp.status_code == 204


class TestSprintLifecycle:
    async def test_start_sprint(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint To Start"},
        )
        sid = create.json()["id"]
        resp = await admin_client.post(f"/api/v1/sprints/{sid}/start")
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    async def test_cannot_start_two_sprints(
        self, admin_client: AsyncClient, test_project: Project
    ):
        r1 = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint X"},
        )
        r2 = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Sprint Y"},
        )
        await admin_client.post(f"/api/v1/sprints/{r1.json()['id']}/start")
        resp = await admin_client.post(f"/api/v1/sprints/{r2.json()['id']}/start")
        assert resp.status_code == 400

    async def test_complete_sprint_calculates_velocity(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        test_org: Organization,
        admin_user: User,
    ):
        open_s, done_s = await _create_workflow_with_statuses(
            db_session, test_org.id, test_project,
        )

        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Velocity Sprint"},
        )
        sid = create.json()["id"]
        await admin_client.post(f"/api/v1/sprints/{sid}/start")

        t1 = Ticket(
            project_id=test_project.id, ticket_number=100, ticket_type="task",
            title="T1", priority="medium", reporter_id=admin_user.id,
            workflow_status_id=done_s.id, sprint_id=sid,
            story_points=5,
        )
        t2 = Ticket(
            project_id=test_project.id, ticket_number=101, ticket_type="task",
            title="T2", priority="medium", reporter_id=admin_user.id,
            workflow_status_id=open_s.id, sprint_id=sid,
            story_points=3,
        )
        db_session.add_all([t1, t2])
        await db_session.flush()

        resp = await admin_client.post(
            f"/api/v1/sprints/{sid}/complete",
            json={"move_incomplete_to": "backlog"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["velocity"] == 5


class TestBacklog:
    async def test_get_backlog(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        admin_user: User,
        test_org: Organization,
    ):
        open_s, _ = await _create_workflow_with_statuses(
            db_session, test_org.id, test_project,
        )
        t1 = Ticket(
            project_id=test_project.id, ticket_number=200, ticket_type="task",
            title="Backlog Ticket", priority="medium", reporter_id=admin_user.id,
            workflow_status_id=open_s.id, sprint_id=None, story_points=2,
        )
        db_session.add(t1)
        await db_session.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/backlog"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        titles = [t["title"] for t in data["items"]]
        assert "Backlog Ticket" in titles

    async def test_move_to_sprint(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        admin_user: User,
        test_org: Organization,
    ):
        open_s, _ = await _create_workflow_with_statuses(
            db_session, test_org.id, test_project,
        )
        sprint_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/sprints",
            json={"name": "Target Sprint"},
        )
        sid = sprint_resp.json()["id"]

        t1 = Ticket(
            project_id=test_project.id, ticket_number=300, ticket_type="task",
            title="Move Me", priority="medium", reporter_id=admin_user.id,
            workflow_status_id=open_s.id, sprint_id=None,
        )
        db_session.add(t1)
        await db_session.flush()

        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/backlog/move-to-sprint",
            json={"ticket_ids": [str(t1.id)], "sprint_id": sid},
        )
        assert resp.status_code == 200
        assert resp.json()["moved"] == 1
