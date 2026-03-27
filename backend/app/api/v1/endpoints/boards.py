from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core import events
from app.core.permissions import ProjectRole, require_project_role
from app.models.user import User
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
    return [BoardRead.model_validate(b) for b in boards]


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
    return BoardRead.model_validate(board)


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
    board = await board_service.create_default_board_for_workflow(
        db, project_id=project_id, workflow_id=workflow_id,
    )
    return BoardRead.model_validate(board)


@router.get(
    "/boards/{board_id}",
    response_model=BoardRead,
)
async def get_board(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return BoardRead.model_validate(board)


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
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    update_data = body.model_dump(exclude_unset=True)
    updated = await board_service.update_board(db, board_id, **update_data)
    return BoardRead.model_validate(updated)


@router.delete(
    "/boards/{board_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_board(
    board_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
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
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
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
    board = await board_service.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
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
    old_status_id = str(old_ticket.workflow_status_id) if old_ticket else None

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
