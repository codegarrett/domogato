from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Sprint, Ticket
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus


pytestmark = pytest.mark.asyncio


async def _setup(db: AsyncSession, org: Organization, project: Project):
    wf = Workflow(organization_id=org.id, name="WF", is_active=True)
    db.add(wf)
    await db.flush()

    todo = WorkflowStatus(
        workflow_id=wf.id, name="To Do", category="todo",
        is_initial=True, is_terminal=False, position=0,
    )
    ip = WorkflowStatus(
        workflow_id=wf.id, name="In Progress", category="in_progress",
        is_initial=False, is_terminal=False, position=1,
    )
    done = WorkflowStatus(
        workflow_id=wf.id, name="Done", category="done",
        is_initial=False, is_terminal=True, position=2,
    )
    db.add_all([todo, ip, done])
    await db.flush()
    project.default_workflow_id = wf.id
    await db.flush()
    return todo, ip, done


class TestReportEndpoints:
    async def test_project_summary(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        todo, ip, done = await _setup(db, test_org, test_project)

        t1 = Ticket(project_id=test_project.id, title="T1", ticket_number=1,
                     workflow_status_id=todo.id, priority="high")
        t2 = Ticket(project_id=test_project.id, title="T2", ticket_number=2,
                     workflow_status_id=ip.id, story_points=5)
        t3 = Ticket(project_id=test_project.id, title="T3", ticket_number=3,
                     workflow_status_id=done.id, story_points=3)
        db.add_all([t1, t2, t3])
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/summary"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_tickets"] == 3
        assert data["open_tickets"] == 1
        assert data["in_progress_tickets"] == 1
        assert data["done_tickets"] == 1
        assert data["completed_story_points"] == 3

    async def test_velocity_report(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        s1 = Sprint(project_id=test_project.id, name="S1", status="completed",
                     velocity=21)
        s2 = Sprint(project_id=test_project.id, name="S2", status="completed",
                     velocity=34)
        db.add_all([s1, s2])
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/velocity"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["entries"]) == 2
        assert data["average"] == 27.5

    async def test_cumulative_flow(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        today = date.today()
        start = today - timedelta(days=3)

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cumulative-flow",
            params={"start_date": str(start), "end_date": str(today)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["days"]) == 4

    async def test_cycle_time(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cycle-time"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "entries" in data
        assert "average_hours" in data

    async def test_sprint_report(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        todo, ip, done = await _setup(db, test_org, test_project)

        sprint = Sprint(project_id=test_project.id, name="Sprint 1",
                        status="active", start_date=date.today() - timedelta(days=7),
                        end_date=date.today())
        db.add(sprint)
        await db.flush()

        t1 = Ticket(project_id=test_project.id, title="Done task", ticket_number=1,
                     workflow_status_id=done.id, story_points=5, sprint_id=sprint.id)
        t2 = Ticket(project_id=test_project.id, title="WIP task", ticket_number=2,
                     workflow_status_id=ip.id, story_points=3, sprint_id=sprint.id)
        db.add_all([t1, t2])
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/sprints/{sprint.id}/report"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sprint_name"] == "Sprint 1"
        assert data["summary"]["total_tickets"] == 2
        assert data["summary"]["completed_tickets"] == 1
        assert data["summary"]["incomplete_tickets"] == 1
        assert data["summary"]["total_story_points"] == 8
        assert data["summary"]["completed_story_points"] == 5
        assert len(data["tickets"]) == 2


class TestCsvExports:
    async def test_velocity_csv(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        s1 = Sprint(project_id=test_project.id, name="S1", status="completed", velocity=21)
        db.add(s1)
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/velocity/csv"
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        lines = resp.text.strip().split("\n")
        assert "sprint_name" in lines[0]
        assert len(lines) >= 2

    async def test_cycle_time_csv(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cycle-time/csv"
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    async def test_cfd_csv(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        today = date.today()
        start = today - timedelta(days=2)
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cumulative-flow/csv",
            params={"start_date": str(start), "end_date": str(today)},
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        lines = resp.text.strip().split("\n")
        assert "date" in lines[0]


class TestAuditLog:
    async def test_project_audit_log(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        from app.models.activity import ActivityLog
        todo, ip, done = await _setup(db, test_org, test_project)

        t1 = Ticket(project_id=test_project.id, title="AuditT", ticket_number=1,
                     workflow_status_id=todo.id)
        db.add(t1)
        await db.flush()

        log = ActivityLog(
            ticket_id=t1.id, user_id=admin_user.id, action="created",
        )
        db.add(log)
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/audit-log"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
        assert data["items"][0]["action"] == "created"

    async def test_audit_log_filter_by_action(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        from app.models.activity import ActivityLog
        todo, ip, done = await _setup(db, test_org, test_project)

        t1 = Ticket(project_id=test_project.id, title="AuditT2", ticket_number=1,
                     workflow_status_id=todo.id)
        db.add(t1)
        await db.flush()

        db.add(ActivityLog(ticket_id=t1.id, user_id=admin_user.id, action="created"))
        db.add(ActivityLog(ticket_id=t1.id, user_id=admin_user.id, action="field_change",
                           field_name="priority", old_value="medium", new_value="high"))
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/audit-log",
            params={"action": "field_change"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert all(e["action"] == "field_change" for e in data["items"])
