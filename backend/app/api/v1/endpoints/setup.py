from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.core.local_jwt import create_access_token
from app.core.password import hash_password, validate_password_strength
from app.models.user import User
from app.services.system_settings_service import (
    get_effective_auth_settings,
    has_system_admin,
    needs_setup,
)

router = APIRouter(prefix="/setup", tags=["setup"])


class SetupStatusResponse(BaseModel):
    needs_setup: bool
    auth_mode: str


class SetupInitializeRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class SetupInitializeResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


@router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status(db: AsyncSession = Depends(get_db)):
    """Check if initial setup is required. No authentication needed."""
    setup_needed = await needs_setup(db)
    effective = await get_effective_auth_settings(db)
    return SetupStatusResponse(
        needs_setup=setup_needed,
        auth_mode=effective["auth_mode"].value,
    )


@router.post("/initialize", response_model=SetupInitializeResponse, status_code=status.HTTP_201_CREATED)
async def initialize_setup(
    body: SetupInitializeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create the first system administrator. Only works when no admin exists."""
    if await has_system_admin(db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup has already been completed. A system administrator already exists.",
        )

    pw_error = validate_password_strength(body.password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        oidc_subject=f"local:{user_id}",
        email=body.email,
        display_name=body.display_name.strip(),
        password_hash=hash_password(body.password),
        is_system_admin=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.commit()

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        expires_minutes=settings.LOCAL_JWT_EXPIRE_MINUTES,
    )

    return SetupInitializeResponse(
        access_token=token,
        expires_in=settings.LOCAL_JWT_EXPIRE_MINUTES * 60,
        user={
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "is_system_admin": True,
        },
    )
