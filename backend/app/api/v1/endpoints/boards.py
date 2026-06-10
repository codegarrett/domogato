from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.api.deps import get_current_user, get_db
from app.core import events
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    require_project_role,
    resolve_effective_project_role,
)
from app.models.board import Board, BoardColumn
from app.models.user import User
from app.services import project_service
from app.schemas.board import (
    BoardColumnCreate,
    BoardColumnRead,
    BoardColumnUpdate,
    BoardCreate,
    BoardRead,
    BoardUpdate,
    MoveTicketRequest,
)
from app.services import board_service

router = APIRouter(tags=["boards"])


async def _require_project_role_for_project(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if (
        effective is None
        or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[minimum]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )


async def _get_board_for_user(
    db: AsyncSession, board_id: UUID, user: User, minimum: ProjectRole,
) -> Board:
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    await _require_project_role_for_project(
        db, board.project_id, user, minimum,
    )
    return board


async def _get_column_for_user(
    db: AsyncSession, column_id: UUID, user: User, minimum: ProjectRole,
) -> BoardColumn:
    result = await db.execute(
        select(BoardColumn).where(BoardColumn.id == column_id)
    )
    col = result.scalar_one_or_none()
    if col is None:
        raise HTTPException(status_code=404, detail="Column not found")
    await _get_board_for_user(db, col.board_id, user, minimum)
    return col


@router.get(
    "/projects/{project_id}/boards",
    response_model=list[BoardRead],
)
async def list_boards(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    boards = await board_service.list_boards(db, project_id)
    return await board_service.boards_to_reads(db, boards)


@router.post(
    "/projects/{project_id}/boards",
    response_model=BoardRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_board(
    project_id: UUID,
    body: BoardCreate,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    board = await board_service.create_board(
        db, project_id=project_id, name=body.name, board_type=body.board_type,
    )
    status_map = await board_service._status_map_for_ids(db, [])
    return board_service.board_to_read(board, status_map)


@router.post(
    "/projects/{project_id}/boards/default",
    response_model=BoardRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_default_board(
    project_id: UUID,
    workflow_id: UUID = Query(...),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    return await board_service.create_default_board_for_workflow(
        db, project_id=project_id, workflow_id=workflow_id,
    )


@router.post(
    "/projects/{project_id}/boards/sync",
    response_model=BoardRead,
)
async def sync_board_columns(
    project_id: UUID,
    board_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    try:
        synced = await board_service.sync_board_columns_from_workflow(
            db, project_id, board_id=board_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if synced is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no default workflow configured",
        )
    return synced


@router.get(
    "/boards/{board_id}",
    response_model=BoardRead,
)
async def get_board(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _get_board_for_user(db, board_id, user, ProjectRole.GUEST)
    status_map = await board_service._status_map_for_ids(
        db, [c.workflow_status_id for c in board.columns]
    )
    return board_service.board_to_read(board, status_map)


@router.patch(
    "/boards/{board_id}",
    response_model=BoardRead,
)
async def update_board(
    board_id: UUID,
    body: BoardUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_board_for_user(db, board_id, user, ProjectRole.MAINTAINER)
    update_data = body.model_dump(exclude_unset=True)
    updated = await board_service.update_board(db, board_id, **update_data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Board not found")
    status_map = await board_service._status_map_for_ids(
        db, [c.workflow_status_id for c in updated.columns]
    )
    return board_service.board_to_read(updated, status_map)


@router.delete(
    "/boards/{board_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_board(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_board_for_user(db, board_id, user, ProjectRole.MAINTAINER)
    await board_service.delete_board(db, board_id)


@router.post(
    "/boards/{board_id}/columns",
    response_model=BoardColumnRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_column(
    board_id: UUID,
    body: BoardColumnCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_board_for_user(db, board_id, user, ProjectRole.MAINTAINER)
    col = await board_service.add_column(
        db, board_id, body.workflow_status_id, wip_limit=body.wip_limit,
    )
    return BoardColumnRead.model_validate(col)


@router.patch(
    "/boards/columns/{column_id}",
    response_model=BoardColumnRead,
)
async def update_column(
    column_id: UUID,
    body: BoardColumnUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_column_for_user(db, column_id, user, ProjectRole.MAINTAINER)
    update_data = body.model_dump(exclude_unset=True)
    col = await board_service.update_column(db, column_id, **update_data)
    if col is None:
        raise HTTPException(status_code=404, detail="Column not found")
    return BoardColumnRead.model_validate(col)


@router.delete(
    "/boards/columns/{column_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_column(
    column_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_column_for_user(db, column_id, user, ProjectRole.MAINTAINER)
    removed = await board_service.remove_column(db, column_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Column not found")


@router.get(
    "/boards/{board_id}/tickets",
)
async def get_board_tickets(
    board_id: UUID,
    sprint_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_board_for_user(db, board_id, user, ProjectRole.GUEST)
    grouped = await board_service.get_board_tickets(db, board_id, sprint_id=sprint_id)
    return grouped


@router.post(
    "/boards/tickets/{ticket_id}/move",
)
async def move_ticket(
    ticket_id: UUID,
    body: MoveTicketRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services import ticket_service as ts
    old_ticket = await ts.get_ticket(db, ticket_id)
    if old_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role_for_project(
        db, old_ticket.project_id, user, ProjectRole.DEVELOPER,
    )
    old_status_id = str(old_ticket.workflow_status_id)

    ticket = await board_service.move_ticket(
        db, ticket_id, body.to_status_id, body.board_rank,
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    boards = await board_service.list_boards(db, ticket.project_id)
    board_id = str(boards[0].id) if boards else None

    await events.publish(
        events.EVENT_TICKET_MOVED,
        ticket_id=str(ticket.id),
        project_id=str(ticket.project_id),
        board_id=board_id or "",
        from_status_id=old_status_id,
        to_status_id=str(ticket.workflow_status_id),
        board_rank=ticket.board_rank,
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    return {"id": str(ticket.id), "workflow_status_id": str(ticket.workflow_status_id), "board_rank": ticket.board_rank}
