"""Service layer for ticket dependency CRUD."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import TicketDependency


async def create_dependency(
    db: AsyncSession,
    *,
    blocking_ticket_id: UUID,
    blocked_ticket_id: UUID,
    dependency_type: str = "blocks",
) -> TicketDependency:
    if blocking_ticket_id == blocked_ticket_id:
        raise ValueError("A ticket cannot depend on itself")

    existing = await db.execute(
        select(TicketDependency).where(
            TicketDependency.blocking_ticket_id == blocking_ticket_id,
            TicketDependency.blocked_ticket_id == blocked_ticket_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError("Dependency already exists")

    dep = TicketDependency(
        blocking_ticket_id=blocking_ticket_id,
        blocked_ticket_id=blocked_ticket_id,
        dependency_type=dependency_type,
    )
    db.add(dep)
    await db.flush()
    await db.refresh(dep)
    return dep


async def list_dependencies(
    db: AsyncSession,
    ticket_id: UUID,
) -> list[TicketDependency]:
    result = await db.execute(
        select(TicketDependency).where(
            or_(
                TicketDependency.blocking_ticket_id == ticket_id,
                TicketDependency.blocked_ticket_id == ticket_id,
            )
        ).order_by(TicketDependency.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_dependency(db: AsyncSession, dependency_id: UUID) -> bool:
    result = await db.execute(
        select(TicketDependency).where(TicketDependency.id == dependency_id)
    )
    dep = result.scalar_one_or_none()
    if dep is None:
        return False
    await db.delete(dep)
    await db.flush()
    return True
