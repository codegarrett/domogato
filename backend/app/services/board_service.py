from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.board import Board, BoardColumn
from app.models.ticket import Ticket
from app.models.workflow import Workflow, WorkflowStatus


async def create_board(
    db: AsyncSession,
    *,
    project_id: UUID,
    name: str,
    board_type: str = "kanban",
    is_default: bool = False,
) -> Board:
    board = Board(
        project_id=project_id,
        name=name,
        board_type=board_type,
        is_default=is_default,
    )
    db.add(board)
    await db.flush()
    await db.refresh(board, attribute_names=["columns"])
    return board


async def get_board(db: AsyncSession, board_id: UUID) -> Board | None:
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.columns))
        .where(Board.id == board_id)
    )
    return result.scalar_one_or_none()


async def list_boards(
    db: AsyncSession, project_id: UUID
) -> list[Board]:
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.columns))
        .where(Board.project_id == project_id)
        .order_by(Board.is_default.desc(), Board.created_at)
    )
    return list(result.scalars().all())


async def update_board(
    db: AsyncSession, board_id: UUID, **kwargs: Any
) -> Board | None:
    board = await get_board(db, board_id)
    if board is None:
        return None
    for k, v in kwargs.items():
        if hasattr(board, k) and v is not None:
            setattr(board, k, v)
    await db.flush()
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.columns))
        .where(Board.id == board_id)
    )
    return result.scalar_one()


async def delete_board(db: AsyncSession, board_id: UUID) -> bool:
    board = await get_board(db, board_id)
    if board is None:
        return False
    await db.delete(board)
    await db.flush()
    return True


async def create_default_board_for_workflow(
    db: AsyncSession,
    project_id: UUID,
    workflow_id: UUID,
    board_name: str = "Board",
) -> Board:
    """Create a default Kanban board with columns from a workflow's statuses."""
    board = await create_board(
        db, project_id=project_id, name=board_name, board_type="kanban", is_default=True,
    )

    statuses = (
        await db.execute(
            select(WorkflowStatus)
            .where(WorkflowStatus.workflow_id == workflow_id)
            .order_by(WorkflowStatus.position)
        )
    ).scalars().all()

    for i, status in enumerate(statuses):
        col = BoardColumn(
            board_id=board.id,
            workflow_status_id=status.id,
            position=i,
        )
        db.add(col)
    await db.flush()

    board_id = board.id
    db.expunge(board)
    return await get_board(db, board_id)  # type: ignore[return-value]


async def add_column(
    db: AsyncSession,
    board_id: UUID,
    workflow_status_id: UUID,
    *,
    wip_limit: int | None = None,
) -> BoardColumn:
    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(BoardColumn.position), -1))
            .where(BoardColumn.board_id == board_id)
        )
    ).scalar_one()

    col = BoardColumn(
        board_id=board_id,
        workflow_status_id=workflow_status_id,
        position=max_pos + 1,
        wip_limit=wip_limit,
    )
    db.add(col)
    await db.flush()
    await db.refresh(col)
    return col


async def update_column(
    db: AsyncSession, column_id: UUID, **kwargs: Any
) -> BoardColumn | None:
    result = await db.execute(
        select(BoardColumn).where(BoardColumn.id == column_id)
    )
    col = result.scalar_one_or_none()
    if col is None:
        return None
    for k, v in kwargs.items():
        if hasattr(col, k):
            setattr(col, k, v)
    await db.flush()
    await db.refresh(col)
    return col


async def remove_column(db: AsyncSession, column_id: UUID) -> bool:
    result = await db.execute(
        select(BoardColumn).where(BoardColumn.id == column_id)
    )
    col = result.scalar_one_or_none()
    if col is None:
        return False
    await db.delete(col)
    await db.flush()
    return True


async def get_board_tickets(
    db: AsyncSession,
    board_id: UUID,
    *,
    sprint_id: UUID | None = None,
) -> dict[str, list[dict]]:
    """Get tickets grouped by workflow_status_id for a board."""
    board = await get_board(db, board_id)
    if board is None:
        return {}

    status_ids = [c.workflow_status_id for c in board.columns]
    if not status_ids:
        return {}

    query = (
        select(Ticket)
        .where(
            Ticket.workflow_status_id.in_(status_ids),
            Ticket.is_deleted == False,  # noqa: E712
        )
    )

    if board.board_type == "scrum" and sprint_id:
        query = query.where(Ticket.sprint_id == sprint_id)
    else:
        project_id = board.project_id
        query = query.where(Ticket.project_id == project_id)

    query = query.order_by(Ticket.board_rank.asc())
    result = await db.execute(query)
    tickets = result.scalars().all()

    grouped: dict[str, list[dict]] = {str(sid): [] for sid in status_ids}
    for t in tickets:
        sid = str(t.workflow_status_id)
        if sid in grouped:
            grouped[sid].append({
                "id": str(t.id),
                "ticket_key": f"{t.ticket_number}",
                "title": t.title,
                "ticket_type": t.ticket_type,
                "priority": t.priority,
                "assignee_id": str(t.assignee_id) if t.assignee_id else None,
                "story_points": t.story_points,
                "board_rank": t.board_rank,
            })
    return grouped


async def move_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    to_status_id: UUID,
    board_rank: str = "m",
) -> Ticket | None:
    """Move a ticket to a new status (column) with a new rank."""
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if ticket is None:
        return None
    ticket.workflow_status_id = to_status_id
    ticket.board_rank = board_rank
    await db.flush()
    await db.refresh(ticket)
    return ticket
