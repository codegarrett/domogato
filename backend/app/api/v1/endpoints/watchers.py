from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.watcher import WatcherAdd, WatcherRead
from app.services import ticket_service, watcher_service

router = APIRouter(tags=["watchers"])


@router.get(
    "/tickets/{ticket_id}/watchers",
    response_model=list[WatcherRead],
)
async def list_watchers(
    ticket_id: UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    rows = await watcher_service.list_watchers(db, ticket_id)
    return rows


@router.post(
    "/tickets/{ticket_id}/watchers",
    response_model=WatcherRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_watcher(
    ticket_id: UUID,
    body: WatcherAdd,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    watcher = await watcher_service.add_watcher(db, ticket_id=ticket_id, user_id=body.user_id)
    if watcher is None:
        raise HTTPException(status_code=404, detail="User not found")
    watchers = await watcher_service.list_watchers(db, ticket_id)
    match = next((w for w in watchers if w["user_id"] == body.user_id), None)
    if match:
        return match
    return {"user_id": body.user_id, "display_name": None, "created_at": watcher.created_at}


@router.delete(
    "/tickets/{ticket_id}/watchers/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_watcher(
    ticket_id: UUID,
    user_id: UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    removed = await watcher_service.remove_watcher(db, ticket_id=ticket_id, user_id=user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Watcher not found")
