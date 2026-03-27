from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Ticket
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus


pytestmark = pytest.mark.asyncio


async def _setup(db: AsyncSession, org: Organization, project: Project) -> WorkflowStatus:
    wf = Workflow(organization_id=org.id, name="WF", is_active=True)
    db.add(wf)
    await db.flush()

    status = WorkflowStatus(
        workflow_id=wf.id, name="Open", category="todo",
        is_initial=True, is_terminal=False, position=0,
    )
    db.add(status)
    await db.flush()

    project.default_workflow_id = wf.id
    await db.flush()
    return status


async def _create_ticket(
    db: AsyncSession, project: Project, status: WorkflowStatus, user: User,
) -> Ticket:
    ticket = Ticket(
        project_id=project.id,
        title="Test ticket",
        ticket_number=1,
        workflow_status_id=status.id,
        reporter_id=user.id,
        original_estimate_seconds=3600,
        remaining_estimate_seconds=3600,
    )
    db.add(ticket)
    await db.flush()
    return ticket


class TestTimeLogCRUD:
    async def test_log_time(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={
                "seconds_spent": 1800,
                "work_date": str(date.today()),
                "description": "Working on feature",
                "activity_type": "development",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["seconds_spent"] == 1800
        assert data["activity_type"] == "development"
        assert data["description"] == "Working on feature"

    async def test_list_time_logs(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 1800, "work_date": str(date.today())},
        )
        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 900, "work_date": str(date.today())},
        )

        resp = await admin_client.get(f"/api/v1/tickets/{ticket.id}/time-logs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    async def test_time_summary(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 1800, "work_date": str(date.today())},
        )

        resp = await admin_client.get(f"/api/v1/tickets/{ticket.id}/time-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_logged_seconds"] == 1800
        assert data["original_estimate_seconds"] == 3600
        assert data["remaining_estimate_seconds"] == 1800

    async def test_update_time_log(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 1800, "work_date": str(date.today())},
        )
        log_id = resp.json()["id"]

        resp = await admin_client.patch(
            f"/api/v1/time-logs/{log_id}",
            json={"seconds_spent": 3600},
        )
        assert resp.status_code == 200
        assert resp.json()["seconds_spent"] == 3600

    async def test_delete_time_log(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 1800, "work_date": str(date.today())},
        )
        log_id = resp.json()["id"]

        resp = await admin_client.delete(f"/api/v1/time-logs/{log_id}")
        assert resp.status_code == 204

        resp = await admin_client.get(f"/api/v1/tickets/{ticket.id}/time-logs")
        assert resp.json()["total"] == 0

    async def test_remaining_estimate_recalc(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 2000, "work_date": str(date.today())},
        )
        resp = await admin_client.get(f"/api/v1/tickets/{ticket.id}/time-summary")
        assert resp.json()["remaining_estimate_seconds"] == 1600

        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 2000, "work_date": str(date.today())},
        )
        resp = await admin_client.get(f"/api/v1/tickets/{ticket.id}/time-summary")
        assert resp.json()["remaining_estimate_seconds"] == 0

    async def test_project_time_report(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 3600, "work_date": str(date.today())},
        )

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/time-report",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_seconds"] == 3600
        assert data["total_entries"] == 1

    async def test_my_timesheet(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        today = date.today()
        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 1800, "work_date": str(today)},
        )
        await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": 900, "work_date": str(today)},
        )

        start = today - timedelta(days=3)
        end = today + timedelta(days=3)
        resp = await admin_client.get(
            f"/api/v1/users/me/timesheet",
            params={"start_date": str(start), "end_date": str(end)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_seconds"] == 2700
        assert len(data["days"]) == 7

    async def test_invalid_seconds_rejected(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        ws = await _setup(db, test_org, test_project)
        ticket = await _create_ticket(db, test_project, ws, admin_user)

        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket.id}/time-logs",
            json={"seconds_spent": -100, "work_date": str(date.today())},
        )
        assert resp.status_code == 422
