from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket_watcher import TicketWatcher
from app.models.user import User


async def add_watcher(
    db: AsyncSession, *, ticket_id: UUID, user_id: UUID
) -> TicketWatcher | None:
    """Add a watcher, ignoring duplicates. Returns the row or None if user doesn't exist."""
    stmt = (
        pg_insert(TicketWatcher)
        .values(ticket_id=ticket_id, user_id=user_id)
        .on_conflict_do_nothing(constraint="uq_ticket_watchers_ticket_user")
        .returning(TicketWatcher)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        existing = await db.execute(
            select(TicketWatcher).where(
                TicketWatcher.ticket_id == ticket_id,
                TicketWatcher.user_id == user_id,
            )
        )
        row = existing.scalar_one_or_none()
    await db.flush()
    return row


async def remove_watcher(
    db: AsyncSession, *, ticket_id: UUID, user_id: UUID
) -> bool:
    result = await db.execute(
        delete(TicketWatcher).where(
            TicketWatcher.ticket_id == ticket_id,
            TicketWatcher.user_id == user_id,
        )
    )
    await db.flush()
    return result.rowcount > 0


async def list_watchers(
    db: AsyncSession, ticket_id: UUID
) -> list[dict]:
    stmt = (
        select(TicketWatcher.user_id, User.display_name, TicketWatcher.created_at)
        .join(User, User.id == TicketWatcher.user_id)
        .where(TicketWatcher.ticket_id == ticket_id)
        .order_by(TicketWatcher.created_at)
    )
    rows = (await db.execute(stmt)).all()
    return [
        {"user_id": r.user_id, "display_name": r.display_name, "created_at": r.created_at}
        for r in rows
    ]


async def get_watcher_user_ids(
    db: AsyncSession, ticket_id: UUID
) -> list[UUID]:
    stmt = select(TicketWatcher.user_id).where(TicketWatcher.ticket_id == ticket_id)
    rows = (await db.execute(stmt)).all()
    return [r.user_id for r in rows]


async def ensure_watchers(
    db: AsyncSession, ticket_id: UUID, user_ids: list[UUID]
) -> None:
    """Add multiple watchers in a single statement, ignoring duplicates."""
    if not user_ids:
        return
    values = [{"ticket_id": ticket_id, "user_id": uid} for uid in user_ids]
    stmt = pg_insert(TicketWatcher).values(values).on_conflict_do_nothing(
        constraint="uq_ticket_watchers_ticket_user"
    )
    await db.execute(stmt)
    await db.flush()
