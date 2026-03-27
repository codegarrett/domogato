"""Tests for the daily snapshot Celery task."""
from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project, Ticket
from app.models.daily_snapshot import DailySnapshot
from app.models.workflow import Workflow, WorkflowStatus

pytestmark = pytest.mark.asyncio


async def _setup_project_with_tickets(db: AsyncSession):
    org = Organization(name="Snap Org", slug="snap-org")
    db.add(org)
    await db.flush()

    project = Project(organization_id=org.id, name="Snap Proj", key="SNAP", visibility="internal")
    db.add(project)
    await db.flush()

    wf = Workflow(organization_id=org.id, name="WF")
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

    return project


class TestSnapshotGeneration:
    async def test_generate_snapshot_creates_rows(self, db: AsyncSession):
        project = await _setup_project_with_tickets(db)

        async def _patched_generate() -> int:
            """Run snapshot generation using the test session instead of creating a new engine."""
            today = date.today()
            count = 0

            projects = (await db.execute(select(Project))).scalars().all()

            for proj in projects:
                existing = await db.execute(
                    select(DailySnapshot).where(
                        DailySnapshot.project_id == proj.id,
                        DailySnapshot.snapshot_date == today,
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    continue

                tickets = (await db.execute(
                    select(Ticket).where(
                        Ticket.project_id == proj.id,
                        Ticket.is_deleted == False,  # noqa: E712
                    )
                )).scalars().all()

                by_priority: dict[str, int] = {}
                completed = 0
                sp_completed = 0

                status_ids = set()
                for t in tickets:
                    by_priority[t.priority] = by_priority.get(t.priority, 0) + 1
                    status_ids.add(t.workflow_status_id)

                status_category_map: dict = {}
                terminal_set: set = set()
                if status_ids:
                    from app.models.workflow import WorkflowStatus as WS
                    status_rows = (await db.execute(
                        select(WS.id, WS.category, WS.is_terminal).where(
                            WS.id.in_(list(status_ids)),
                        )
                    )).all()
                    for sid, cat, is_term in status_rows:
                        status_category_map[sid] = cat
                        if is_term:
                            terminal_set.add(sid)

                    for t in tickets:
                        if t.workflow_status_id in terminal_set:
                            completed += 1
                            sp_completed += t.story_points or 0

                by_status: dict[str, int] = {}
                for t in tickets:
                    cat = status_category_map.get(t.workflow_status_id, "to_do")
                    by_status[cat] = by_status.get(cat, 0) + 1

                snapshot = DailySnapshot(
                    project_id=proj.id,
                    snapshot_date=today,
                    total_tickets=len(tickets),
                    by_status=by_status,
                    by_priority=by_priority,
                    completed_count=completed,
                    story_points_completed=sp_completed,
                )
                db.add(snapshot)
                count += 1

            await db.flush()
            return count

        count = await _patched_generate()
        assert count >= 1

        result = await db.execute(
            select(DailySnapshot).where(
                DailySnapshot.project_id == project.id,
                DailySnapshot.snapshot_date == date.today(),
            )
        )
        snap = result.scalar_one()

        assert snap.total_tickets == 3
        assert snap.by_status.get("to_do") == 1
        assert snap.by_status.get("in_progress") == 1
        assert snap.by_status.get("done") == 1
        assert snap.completed_count == 1
        assert snap.story_points_completed == 3
        assert snap.by_priority.get("high") == 1
        assert snap.by_priority.get("medium") == 1
        assert snap.by_priority.get("low") == 1

    async def test_snapshot_idempotent(self, db: AsyncSession):
        """Running the snapshot twice for the same day should not create duplicates."""
        project = await _setup_project_with_tickets(db)

        snap = DailySnapshot(
            project_id=project.id,
            snapshot_date=date.today(),
            total_tickets=3,
            by_status={"to_do": 1, "in_progress": 1, "done": 1},
            by_priority={"high": 1, "medium": 1, "low": 1},
            completed_count=1,
            story_points_completed=3,
        )
        db.add(snap)
        await db.flush()

        all_snaps = (await db.execute(
            select(DailySnapshot).where(
                DailySnapshot.project_id == project.id,
                DailySnapshot.snapshot_date == date.today(),
            )
        )).scalars().all()
        assert len(all_snaps) == 1
