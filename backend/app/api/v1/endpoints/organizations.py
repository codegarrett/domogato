from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import OrgRole, ORG_ROLE_HIERARCHY, require_system_admin
from app.models.membership import OrgMembership
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.organization import (
    OrgMemberCreate,
    OrgMemberRead,
    OrgMemberUpdate,
    OrganizationCreate,
    OrganizationRead,
    OrganizationUpdate,
)
from app.services import organization_service, user_service, workflow_service

router = APIRouter(prefix="/organizations", tags=["organizations"])


async def _get_org_membership(
    db: AsyncSession, org_id: UUID, user: User
) -> OrgMembership:
    if user.is_system_admin:
        return OrgMembership(
            user_id=user.id,
            organization_id=org_id,
            role=OrgRole.OWNER.value,
        )
    membership = await organization_service.get_member(db, org_id, user.id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return membership


def _check_min_role(membership: OrgMembership, minimum: OrgRole) -> None:
    if ORG_ROLE_HIERARCHY[OrgRole(membership.role)] < ORG_ROLE_HIERARCHY[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum.value} role or higher",
        )


@router.get("", response_model=PaginatedResponse[OrganizationRead])
async def list_organizations(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List organizations for the current user (system admin sees all)."""
    orgs, total = await organization_service.list_organizations_for_user(
        db, user.id, is_system_admin=user.is_system_admin, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[OrganizationRead.model_validate(o) for o in orgs],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization. System admin only."""
    try:
        org = await organization_service.create_organization(
            db,
            name=body.name,
            slug=body.slug,
            description=body.description,
            avatar_url=body.avatar_url,
            settings=body.settings,
            creator_user_id=_admin.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )

    await workflow_service.seed_default_workflows(db, org.id)

    return org


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(
    org_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization details. Requires org membership."""
    await _get_org_membership(db, org_id, user)
    org = await organization_service.get_organization(db, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    org_id: UUID,
    body: OrganizationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an organization. Requires org admin role."""
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    update_data = body.model_dump(exclude_unset=True)
    org = await organization_service.update_organization(db, org_id, **update_data)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_organization(
    org_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate an organization. Requires org owner role."""
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.OWNER)

    org = await organization_service.deactivate_organization(db, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")


@router.get("/{org_id}/members", response_model=PaginatedResponse[OrgMemberRead])
async def list_members(
    org_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List organization members. Requires org membership."""
    await _get_org_membership(db, org_id, user)
    members, total = await organization_service.list_members(
        db, org_id, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[OrgMemberRead(**m) for m in members],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/{org_id}/members",
    response_model=OrgMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    org_id: UUID,
    body: OrgMemberCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to the organization. Requires org admin role."""
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    target_user_id = body.user_id
    if target_user_id is None and body.email:
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.email == body.email)
        )
        target_user = result.scalar_one_or_none()
        if target_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        target_user_id = target_user.id

    if target_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either user_id or email",
        )

    try:
        new_membership = await organization_service.add_member(
            db, org_id, target_user_id, body.role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )

    target = await user_service.get_user_by_id(db, target_user_id)
    return OrgMemberRead(
        id=new_membership.id,
        user_id=target_user_id,
        email=target.email,
        display_name=target.display_name,
        avatar_url=target.avatar_url,
        role=new_membership.role,
        created_at=new_membership.created_at,
    )


@router.patch("/{org_id}/members/{user_id}", response_model=OrgMemberRead)
async def update_member_role(
    org_id: UUID,
    user_id: UUID,
    body: OrgMemberUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role. Requires org admin role."""
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    updated = await organization_service.update_member_role(db, org_id, user_id, body.role)
    if updated is None:
        raise HTTPException(status_code=404, detail="Membership not found")

    target = await user_service.get_user_by_id(db, user_id)
    return OrgMemberRead(
        id=updated.id,
        user_id=user_id,
        email=target.email,
        display_name=target.display_name,
        avatar_url=target.avatar_url,
        role=updated.role,
        created_at=updated.created_at,
    )


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: UUID,
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the organization. Requires org admin role."""
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    removed = await organization_service.remove_member(db, org_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Membership not found")
