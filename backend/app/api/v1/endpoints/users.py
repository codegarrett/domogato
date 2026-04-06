from __future__ import annotations

import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.password import hash_password, validate_password_strength
from app.core.permissions import require_system_admin
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.user import (
    OrgMembershipRead,
    ProjectMembershipRead,
    UserAdminUpdate,
    UserRead,
    UserReadWithMemberships,
    UserUpdate,
)
from app.services import user_service
from app.services.storage_service import (
    generate_avatar_s3_key,
    generate_upload_presign,
    delete_object,
    StorageUnavailableError,
)
from app.core.config import settings

router = APIRouter(prefix="/users", tags=["users"])

AVATAR_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/gif", "image/webp"})


class AvatarUploadRequest(BaseModel):
    filename: str
    content_type: str


class AvatarUploadResponse(BaseModel):
    upload_url: str
    avatar_key: str


class AvatarConfirmRequest(BaseModel):
    avatar_key: str


class AvatarConfirmResponse(BaseModel):
    avatar_url: str


@router.get("/me", response_model=UserReadWithMemberships)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile including all memberships."""
    full_user = await user_service.get_user_with_memberships(db, user.id)
    if full_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    org_memberships = []
    for m in full_user.org_memberships:
        org_memberships.append(OrgMembershipRead(
            id=m.id,
            organization_id=m.organization_id,
            organization_name=m.organization.name if m.organization else None,
            organization_slug=m.organization.slug if m.organization else None,
            role=m.role,
            created_at=m.created_at,
        ))

    project_memberships = []
    for m in full_user.project_memberships:
        project_memberships.append(ProjectMembershipRead(
            id=m.id,
            project_id=m.project_id,
            project_name=m.project.name if m.project else None,
            project_key=m.project.key if m.project else None,
            role=m.role,
            created_at=m.created_at,
        ))

    return UserReadWithMemberships(
        id=full_user.id,
        email=full_user.email,
        display_name=full_user.display_name,
        avatar_url=full_user.avatar_url,
        is_system_admin=full_user.is_system_admin,
        is_active=full_user.is_active,
        preferences=full_user.preferences or {},
        last_login_at=full_user.last_login_at,
        created_at=full_user.created_at,
        updated_at=full_user.updated_at,
        org_memberships=org_memberships,
        project_memberships=project_memberships,
    )


@router.patch("/me", response_model=UserRead)
async def update_current_user(
    update_data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile and preferences."""
    update_dict = update_data.model_dump(exclude_unset=True)
    preferences = update_dict.pop("preferences", None)

    if update_dict:
        non_none = {k: v for k, v in update_dict.items() if v is not None}
        if non_none:
            await user_service.update_user_profile(db, user, **non_none)

    if preferences is not None:
        await user_service.update_user_preferences(db, user, preferences)

    return user


@router.post("/me/avatar", response_model=AvatarUploadResponse, status_code=status.HTTP_201_CREATED)
async def request_avatar_upload(
    body: AvatarUploadRequest,
    user: User = Depends(get_current_user),
):
    if body.content_type not in AVATAR_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type must be one of: {', '.join(sorted(AVATAR_CONTENT_TYPES))}",
        )
    avatar_key = generate_avatar_s3_key(str(user.id), body.filename)
    try:
        upload_url = await generate_upload_presign(avatar_key, body.content_type)
    except StorageUnavailableError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage unavailable")
    return AvatarUploadResponse(upload_url=upload_url, avatar_key=avatar_key)


@router.post("/me/avatar/confirm", response_model=AvatarConfirmResponse)
async def confirm_avatar_upload(
    body: AvatarConfirmRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.avatar_key.startswith(f"users/{user.id}/avatar/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid avatar key")

    avatar_url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{body.avatar_key}"
    await user_service.update_user_profile(db, user, avatar_url=avatar_url)
    return AvatarConfirmResponse(avatar_url=avatar_url)


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.avatar_url and user.avatar_url.startswith(f"{settings.S3_ENDPOINT_URL}"):
        key = user.avatar_url.split(f"{settings.S3_BUCKET_NAME}/", 1)[-1]
        await delete_object(key)
    await user_service.update_user_profile(db, user, avatar_url=None)


class UserSearchResult(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None = None


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Search by name or email"),
    limit: int = Query(20, ge=1, le=50),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by name or email. Available to any authenticated user."""
    users, _ = await user_service.list_users(
        db, offset=0, limit=limit, search=q, include_inactive=False,
    )
    return [
        UserSearchResult(
            id=str(u.id), email=u.email,
            display_name=u.display_name, avatar_url=u.avatar_url,
        )
        for u in users
    ]


@router.get("", response_model=PaginatedResponse[UserRead])
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: str | None = Query(None, description="Search by name or email"),
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """List all users. System admin only."""
    users, total = await user_service.list_users(db, offset=offset, limit=limit, search=q, include_inactive=True)
    return PaginatedResponse(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        offset=offset,
        limit=limit,
    )


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    display_name: str = Field(..., min_length=1, max_length=255)
    is_system_admin: bool = False


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    body: AdminCreateUserRequest,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Create a new local user. System admin only."""
    pw_error = validate_password_strength(body.password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user_id = uuid_mod.uuid4()
    user = User(
        id=user_id,
        oidc_subject=f"local:{user_id}",
        email=body.email,
        display_name=body.display_name.strip(),
        password_hash=hash_password(body.password),
        is_system_admin=body.is_system_admin,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    from app.services.auto_membership_service import apply_auto_join_for_new_user
    await apply_auto_join_for_new_user(db, user.id)

    await db.commit()
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: UUID,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Get a user by ID. System admin only."""
    user = await user_service.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: UUID,
    update_data: UserAdminUpdate,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's admin fields. System admin only."""
    user = await user_service.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    await user_service.update_user_profile(db, user, **update_dict)
    return user
