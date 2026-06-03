from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.board import Board, BoardColumn
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.workflow import Workflow, WorkflowStatus
from app.schemas.board import BoardColumnRead, BoardRead


async def _status_map_for_ids(
    db: AsyncSession, status_ids: list[UUID]
) -> dict[UUID, WorkflowStatus]:
    if not status_ids:
        return {}
    result = await db.execute(
        select(WorkflowStatus).where(WorkflowStatus.id.in_(status_ids))
    )
    return {s.id: s for s in result.scalars().all()}


def board_to_read(board: Board, status_map: dict[UUID, WorkflowStatus]) -> BoardRead:
    columns: list[BoardColumnRead] = []
    for col in board.columns:
        st = status_map.get(col.workflow_status_id)
        columns.append(
            BoardColumnRead(
                id=col.id,
                board_id=col.board_id,
                workflow_status_id=col.workflow_status_id,
                position=col.position,
                wip_limit=col.wip_limit,
                is_collapsed=col.is_collapsed,
                status_name=st.name if st else None,
                status_color=st.color if st else None,
                status_category=st.category if st else None,
            )
        )
    return BoardRead(
        id=board.id,
        project_id=board.project_id,
        name=board.name,
        board_type=board.board_type,
        filter_config=board.filter_config or {},
        is_default=board.is_default,
        columns=columns,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


async def boards_to_reads(db: AsyncSession, boards: list[Board]) -> list[BoardRead]:
    status_ids = [
        c.workflow_status_id for b in boards for c in b.columns
    ]
    status_map = await _status_map_for_ids(db, status_ids)
    return [board_to_read(b, status_map) for b in boards]


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
            .where(
                WorkflowStatus.workflow_id == workflow_id,
                WorkflowStatus.show_on_board == True,  # noqa: E712
            )
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
    reloaded = await get_board(db, board_id)
    if reloaded is None:
        raise ValueError("Board not found after creation")
    status_map = await _status_map_for_ids(
        db, [c.workflow_status_id for c in reloaded.columns]
    )
    return board_to_read(reloaded, status_map)


async def sync_board_columns_from_workflow(
    db: AsyncSession,
    project_id: UUID,
    *,
    board_id: UUID | None = None,
) -> BoardRead | None:
    """Replace board columns with statuses from the project's default workflow."""
    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if project is None or project.default_workflow_id is None:
        return None

    workflow_id = project.default_workflow_id
    boards = await list_boards(db, project_id)
    target: Board | None = None
    if board_id is not None:
        target = await get_board(db, board_id)
    else:
        target = next((b for b in boards if b.is_default), boards[0] if boards else None)

    if target is None:
        created = await create_default_board_for_workflow(
            db, project_id, workflow_id,
        )
        return created

    for col in list(target.columns):
        await db.delete(col)
    await db.flush()

    statuses = (
        await db.execute(
            select(WorkflowStatus)
            .where(
                WorkflowStatus.workflow_id == workflow_id,
                WorkflowStatus.show_on_board == True,  # noqa: E712
            )
            .order_by(WorkflowStatus.position)
        )
    ).scalars().all()

    for i, status in enumerate(statuses):
        db.add(
            BoardColumn(
                board_id=target.id,
                workflow_status_id=status.id,
                position=i,
            )
        )
    await db.flush()

    reloaded = await get_board(db, target.id)
    if reloaded is None:
        return None
    status_map = await _status_map_for_ids(
        db, [c.workflow_status_id for c in reloaded.columns]
    )
    return board_to_read(reloaded, status_map)


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

    project = (
        await db.execute(select(Project).where(Project.id == board.project_id))
    ).scalar_one_or_none()
    project_key = project.key if project else ""

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

    query = query.where(Ticket.project_id == board.project_id)
    if sprint_id:
        query = query.where(Ticket.sprint_id == sprint_id)

    query = query.order_by(Ticket.board_rank.asc())
    result = await db.execute(query)
    tickets = result.scalars().all()

    grouped: dict[str, list[dict]] = {str(sid): [] for sid in status_ids}
    for t in tickets:
        sid = str(t.workflow_status_id)
        if sid in grouped:
            ticket_key = (
                f"{project_key}-{t.ticket_number}"
                if project_key
                else str(t.ticket_number)
            )
            grouped[sid].append({
                "id": str(t.id),
                "ticket_key": ticket_key,
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
