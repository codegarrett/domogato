"""Tests for Phase 2.7 performance features: caching and snapshot-based CFD."""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Ticket
from app.models.daily_snapshot import DailySnapshot
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus

pytestmark = pytest.mark.asyncio


async def _setup_with_tickets(db: AsyncSession, org: Organization, project: Project):
    wf = Workflow(organization_id=org.id, name="WF", is_active=True)
    db.add(wf)
    await db.flush()

    todo = WorkflowStatus(
        workflow_id=wf.id, name="To Do", category="to_do",
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

    t1 = Ticket(project_id=project.id, title="T1", ticket_number=1,
                 workflow_status_id=todo.id, priority="high")
    t2 = Ticket(project_id=project.id, title="T2", ticket_number=2,
                 workflow_status_id=ip.id, priority="medium", story_points=5)
    t3 = Ticket(project_id=project.id, title="T3", ticket_number=3,
                 workflow_status_id=done.id, priority="low", story_points=3)
    db.add_all([t1, t2, t3])
    await db.flush()

    return todo, ip, done


class TestCumulativeFlowWithSnapshots:
    async def test_cfd_uses_snapshot_data(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        await _setup_with_tickets(db, test_org, test_project)

        today = date.today()
        yesterday = today - timedelta(days=1)

        snap = DailySnapshot(
            project_id=test_project.id,
            snapshot_date=yesterday,
            total_tickets=10,
            by_status={"to_do": 4, "in_progress": 3, "done": 3},
            by_priority={"high": 5, "medium": 3, "low": 2},
            completed_count=3,
            story_points_completed=15,
        )
        db.add(snap)
        await db.flush()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cumulative-flow",
            params={"start_date": str(yesterday), "end_date": str(today)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["days"]) == 2

        yesterday_day = data["days"][0]
        assert yesterday_day["todo"] == 4
        assert yesterday_day["in_progress"] == 3
        assert yesterday_day["done"] == 3

    async def test_cfd_falls_back_to_live_query(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        """For dates with no snapshot, the live query provides data."""
        await _setup_with_tickets(db, test_org, test_project)
        today = date.today()

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/reports/cumulative-flow",
            params={"start_date": str(today), "end_date": str(today)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["days"]) == 1
        day = data["days"][0]
        assert day["todo"] + day["in_progress"] + day["done"] == 3


class TestProjectCaching:
    async def test_get_project_returns_data(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project,
    ):
        """Verify get_project endpoint still works with caching layer."""
        resp = await admin_client.get(f"/api/v1/projects/{test_project.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Project"
        assert data["key"] == "TEST"

    async def test_update_project_invalidates_cache(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization, test_project: Project, admin_user: User,
    ):
        from app.models.membership import ProjectMembership
        pm = ProjectMembership(user_id=admin_user.id, project_id=test_project.id, role="owner")
        db.add(pm)
        await db.flush()

        resp = await admin_client.get(f"/api/v1/projects/{test_project.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Project"

        resp2 = await admin_client.patch(
            f"/api/v1/projects/{test_project.id}",
            json={"name": "Updated Project"},
        )
        assert resp2.status_code == 200

        resp3 = await admin_client.get(f"/api/v1/projects/{test_project.id}")
        assert resp3.status_code == 200
        assert resp3.json()["name"] == "Updated Project"


class TestWorkflowCaching:
    async def test_list_workflows_returns_data(
        self, admin_client: AsyncClient, db: AsyncSession,
        test_org: Organization,
    ):
        from app.models.membership import OrgMembership
        from tests.conftest import admin_user

        resp = await admin_client.get(
            f"/api/v1/organizations/{test_org.id}/workflows"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
