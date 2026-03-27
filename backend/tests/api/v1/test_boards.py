from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Ticket
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus


pytestmark = pytest.mark.asyncio


async def _setup_workflow(db: AsyncSession, org_id, project: Project):
    wf = Workflow(organization_id=org_id, name="BoardWF", is_active=True)
    db.add(wf)
    await db.flush()
    s1 = WorkflowStatus(
        workflow_id=wf.id, name="Todo", category="todo",
        is_initial=True, is_terminal=False, position=0,
    )
    s2 = WorkflowStatus(
        workflow_id=wf.id, name="In Progress", category="in_progress",
        is_initial=False, is_terminal=False, position=1,
    )
    s3 = WorkflowStatus(
        workflow_id=wf.id, name="Done", category="done",
        is_initial=False, is_terminal=True, position=2,
    )
    db.add_all([s1, s2, s3])
    await db.flush()
    project.default_workflow_id = wf.id
    await db.flush()
    return wf, s1, s2, s3


class TestBoardCRUD:
    async def test_create_board(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/boards",
            json={"name": "Main Board"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Main Board"
        assert resp.json()["board_type"] == "kanban"

    async def test_list_boards(self, admin_client: AsyncClient, test_project: Project):
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/boards",
            json={"name": "Board 1"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/boards"
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_create_default_board(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        test_org: Organization,
    ):
        wf, s1, s2, s3 = await _setup_workflow(db_session, test_org.id, test_project)

        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/boards/default",
            params={"workflow_id": str(wf.id)},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_default"] is True
        assert len(data["columns"]) == 3

    async def test_delete_board(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/boards",
            json={"name": "Delete Me"},
        )
        bid = create.json()["id"]
        resp = await admin_client.delete(f"/api/v1/boards/{bid}")
        assert resp.status_code == 204


class TestBoardTickets:
    async def test_get_board_tickets(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        test_org: Organization,
        admin_user: User,
    ):
        wf, s1, s2, s3 = await _setup_workflow(db_session, test_org.id, test_project)

        board_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/boards/default",
            params={"workflow_id": str(wf.id)},
        )
        board_id = board_resp.json()["id"]

        t1 = Ticket(
            project_id=test_project.id, ticket_number=500, ticket_type="task",
            title="Board Ticket", priority="medium", reporter_id=admin_user.id,
            workflow_status_id=s1.id, story_points=3,
        )
        db_session.add(t1)
        await db_session.flush()

        resp = await admin_client.get(f"/api/v1/boards/{board_id}/tickets")
        assert resp.status_code == 200
        data = resp.json()
        assert str(s1.id) in data
        assert len(data[str(s1.id)]) >= 1

    async def test_move_ticket(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        db_session: AsyncSession,
        test_org: Organization,
        admin_user: User,
    ):
        wf, s1, s2, s3 = await _setup_workflow(db_session, test_org.id, test_project)

        t1 = Ticket(
            project_id=test_project.id, ticket_number=501, ticket_type="task",
            title="Move Me", priority="high", reporter_id=admin_user.id,
            workflow_status_id=s1.id,
        )
        db_session.add(t1)
        await db_session.flush()

        resp = await admin_client.post(
            f"/api/v1/boards/tickets/{t1.id}/move",
            json={"to_status_id": str(s2.id), "board_rank": "m"},
        )
        assert resp.status_code == 200
        assert resp.json()["workflow_status_id"] == str(s2.id)
