from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    OrgRole,
    ORG_ROLE_HIERARCHY,
    ProjectRole,
    PROJECT_ROLE_HIERARCHY,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectMemberUpdate,
    ProjectRead,
    ProjectUpdate,
)
from app.services import organization_service, project_service, user_service, workflow_service
from app.services import cache_service

router = APIRouter(tags=["projects"])


async def _require_org_role(
    db: AsyncSession, org_id: UUID, user: User, minimum: OrgRole
) -> None:
    if user.is_system_admin:
        return
    membership = await organization_service.get_member(db, org_id, user.id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    if ORG_ROLE_HIERARCHY[OrgRole(membership.role)] < ORG_ROLE_HIERARCHY[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum.value} role or higher",
        )


async def _require_project_role(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole
) -> None:
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    effective_role = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )

    if effective_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this project",
        )
    if PROJECT_ROLE_HIERARCHY[effective_role] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum.value} role or higher",
        )


# ---------- Org-scoped project endpoints ----------


@router.get(
    "/organizations/{org_id}/projects",
    response_model=PaginatedResponse[ProjectRead],
)
async def list_projects(
    org_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List projects in an organization (filtered by visibility/membership)."""
    projects, total = await project_service.list_projects_for_user(
        db, org_id, user.id,
        is_system_admin=user.is_system_admin,
        offset=offset,
        limit=limit,
    )
    return PaginatedResponse(
        items=[ProjectRead.model_validate(p) for p in projects],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/organizations/{org_id}/projects",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    org_id: UUID,
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a project in the organization. Requires org admin role."""
    await _require_org_role(db, org_id, user, OrgRole.ADMIN)

    org = await organization_service.get_organization(db, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    try:
        project = await project_service.create_project(
            db,
            org_id=org_id,
            name=body.name,
            key=body.key,
            description=body.description,
            visibility=body.visibility,
            settings=body.settings,
            creator_user_id=user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )

    if project.default_workflow_id is None:
        workflows, _ = await workflow_service.list_workflows(db, org_id, offset=0, limit=1)
        if not workflows:
            workflows = await workflow_service.seed_default_workflows(db, org_id)
        if workflows:
            project = await project_service.update_project(
                db, project.id, default_workflow_id=workflows[0].id
            )

    return project


# ---------- Project-scoped endpoints ----------


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get project details. Requires guest+ access."""
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    cache_key = f"project:{project_id}"

    async def _load():
        project = await project_service.get_project(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        return ProjectRead.model_validate(project).model_dump()

    return await cache_service.get_cached(cache_key, _load, ttl=300)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)

    update_data = body.model_dump(exclude_unset=True)
    project = await project_service.update_project(db, project_id, **update_data)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await cache_service.invalidate(f"project:{project_id}")
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive a project (soft delete). Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)
    project = await project_service.archive_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await cache_service.invalidate(f"project:{project_id}")


@router.post("/projects/{project_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive a project. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)
    project = await project_service.archive_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await cache_service.invalidate(f"project:{project_id}")


@router.post("/projects/{project_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT)
async def unarchive_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unarchive a project. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)
    project = await project_service.unarchive_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await cache_service.invalidate(f"project:{project_id}")


# ---------- Project member endpoints ----------


@router.get(
    "/projects/{project_id}/members",
    response_model=PaginatedResponse[ProjectMemberRead],
)
async def list_project_members(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List project members. Requires guest+ access."""
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    members, total = await project_service.list_members(
        db, project_id, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[ProjectMemberRead(**m) for m in members],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/projects/{project_id}/members",
    response_model=ProjectMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_project_member(
    project_id: UUID,
    body: ProjectMemberCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to the project. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)

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
        raise HTTPException(status_code=422, detail="Provide user_id or email")

    target = await user_service.get_user_by_id(db, target_user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        membership = await project_service.add_member(
            db, project_id, target_user_id, body.role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )

    return ProjectMemberRead(
        id=membership.id,
        user_id=target_user_id,
        email=target.email,
        display_name=target.display_name,
        avatar_url=target.avatar_url,
        role=membership.role,
        created_at=membership.created_at,
    )


@router.patch("/projects/{project_id}/members/{user_id}", response_model=ProjectMemberRead)
async def update_project_member_role(
    project_id: UUID,
    user_id: UUID,
    body: ProjectMemberUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project member's role. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)

    updated = await project_service.update_member_role(db, project_id, user_id, body.role)
    if updated is None:
        raise HTTPException(status_code=404, detail="Membership not found")

    target = await user_service.get_user_by_id(db, user_id)
    return ProjectMemberRead(
        id=updated.id,
        user_id=user_id,
        email=target.email,
        display_name=target.display_name,
        avatar_url=target.avatar_url,
        role=updated.role,
        created_at=updated.created_at,
    )


@router.delete(
    "/projects/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the project. Requires project owner role."""
    await _require_project_role(db, project_id, user, ProjectRole.OWNER)
    removed = await project_service.remove_member(db, project_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Membership not found")
