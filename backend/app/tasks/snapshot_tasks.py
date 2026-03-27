"""Celery task for generating daily project snapshots for cumulative flow diagrams."""
from __future__ import annotations

import asyncio
from datetime import date, timezone

from app.tasks.celery_app import celery_app


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _generate_snapshots() -> int:
    from sqlalchemy import func, select
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

    from app.core.config import settings
    from app.models.daily_snapshot import DailySnapshot
    from app.models.project import Project
    from app.models.ticket import Ticket
    from app.models.workflow import WorkflowStatus

    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    today = date.today()
    count = 0

    async with session_factory() as db:
        projects = (await db.execute(select(Project))).scalars().all()

        for project in projects:
            existing = await db.execute(
                select(DailySnapshot).where(
                    DailySnapshot.project_id == project.id,
                    DailySnapshot.snapshot_date == today,
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            tickets = (await db.execute(
                select(Ticket).where(
                    Ticket.project_id == project.id,
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

            status_category_map: dict[str, str] = {}
            if status_ids:
                status_rows = (await db.execute(
                    select(WorkflowStatus.id, WorkflowStatus.category, WorkflowStatus.is_terminal).where(
                        WorkflowStatus.id.in_(list(status_ids)),
                    )
                )).all()
                for sid, cat, is_term in status_rows:
                    status_category_map[sid] = cat
                    if is_term:
                        pass  # handled below

                terminal_set = {sid for sid, _, is_term in status_rows if is_term}
                for t in tickets:
                    if t.workflow_status_id in terminal_set:
                        completed += 1
                        sp_completed += t.story_points or 0

            by_status: dict[str, int] = {}
            for t in tickets:
                cat = status_category_map.get(t.workflow_status_id, "to_do")
                by_status[cat] = by_status.get(cat, 0) + 1

            snapshot = DailySnapshot(
                project_id=project.id,
                snapshot_date=today,
                total_tickets=len(tickets),
                by_status=by_status,
                by_priority=by_priority,
                completed_count=completed,
                story_points_completed=sp_completed,
            )
            db.add(snapshot)
            count += 1

        await db.commit()

    await engine.dispose()
    return count


@celery_app.task(name="generate_daily_snapshots")
def generate_daily_snapshots() -> dict:
    count = _run_async(_generate_snapshots())
    return {"snapshots_created": count}
