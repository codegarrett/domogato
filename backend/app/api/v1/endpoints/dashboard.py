from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/users/me/dashboard")
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_service.get_dashboard_data(db, user.id)
