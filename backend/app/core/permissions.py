from __future__ import annotations

import enum
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db


class OrgRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class ProjectRole(str, enum.Enum):
    OWNER = "owner"
    MAINTAINER = "maintainer"
    DEVELOPER = "developer"
    REPORTER = "reporter"
    GUEST = "guest"


ORG_ROLE_HIERARCHY: dict[OrgRole, int] = {
    OrgRole.MEMBER: 10,
    OrgRole.ADMIN: 20,
    OrgRole.OWNER: 30,
}

PROJECT_ROLE_HIERARCHY: dict[ProjectRole, int] = {
    ProjectRole.GUEST: 10,
    ProjectRole.REPORTER: 20,
    ProjectRole.DEVELOPER: 30,
    ProjectRole.MAINTAINER: 40,
    ProjectRole.OWNER: 50,
}

# Org role -> implicit minimum project role mapping
ORG_TO_PROJECT_ROLE: dict[OrgRole, ProjectRole | None] = {
    OrgRole.OWNER: ProjectRole.OWNER,
    OrgRole.ADMIN: ProjectRole.MAINTAINER,
    OrgRole.MEMBER: None,
}


async def resolve_effective_project_role(
    user_id: UUID,
    project_id: UUID,
    organization_id: UUID,
    project_visibility: str,
    is_system_admin: bool,
    db: AsyncSession,
) -> ProjectRole | None:
    """
    Resolve the effective project role for a user considering:
    1. System admin -> Owner
    2. Explicit project membership
    3. Org membership with implicit mapping
    """
    from app.models.membership import OrgMembership, ProjectMembership

    if is_system_admin:
        return ProjectRole.OWNER

    result = await db.execute(
        select(ProjectMembership.role).where(
            ProjectMembership.user_id == user_id,
            ProjectMembership.project_id == project_id,
        )
    )
    explicit_role_str = result.scalar_one_or_none()
    explicit_role = ProjectRole(explicit_role_str) if explicit_role_str else None

    result = await db.execute(
        select(OrgMembership.role).where(
            OrgMembership.user_id == user_id,
            OrgMembership.organization_id == organization_id,
        )
    )
    org_role_str = result.scalar_one_or_none()

    if org_role_str is None and explicit_role is None:
        return None

    org_implicit_role: ProjectRole | None = None
    if org_role_str:
        org_role = OrgRole(org_role_str)
        org_implicit_role = ORG_TO_PROJECT_ROLE.get(org_role)

        if org_role == OrgRole.MEMBER:
            if project_visibility == "internal":
                org_implicit_role = ProjectRole.GUEST
            elif project_visibility == "private":
                org_implicit_role = None

    roles = [r for r in [explicit_role, org_implicit_role] if r is not None]
    if not roles:
        return None

    return max(roles, key=lambda r: PROJECT_ROLE_HIERARCHY[r])


def require_system_admin():
    """FastAPI dependency that enforces system admin role."""
    from app.api.deps import get_current_user
    from app.models.user import User

    async def _check(user: User = Depends(get_current_user)) -> User:
        if not user.is_system_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="System admin access required",
            )
        return user
    return Depends(_check)


def require_org_role(minimum_role: OrgRole):
    """FastAPI dependency factory that enforces a minimum org role."""
    from app.api.deps import get_current_user
    from app.models.user import User
    from app.models.membership import OrgMembership

    async def _check(
        org_id: UUID,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> OrgMembership | None:
        if user.is_system_admin:
            return OrgMembership(
                user_id=user.id,
                organization_id=org_id,
                role=OrgRole.OWNER.value,
            )

        result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == user.id,
                OrgMembership.organization_id == org_id,
            )
        )
        membership = result.scalar_one_or_none()

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization",
            )

        if ORG_ROLE_HIERARCHY[OrgRole(membership.role)] < ORG_ROLE_HIERARCHY[minimum_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {minimum_role.value} role or higher",
            )

        return membership
    return Depends(_check)


def require_project_role(minimum_role: ProjectRole):
    """FastAPI dependency factory that enforces a minimum project role."""
    from app.api.deps import get_current_user
    from app.models.user import User
    from app.models.project import Project

    async def _check(
        project_id: UUID,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> ProjectRole:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

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

        if PROJECT_ROLE_HIERARCHY[effective_role] < PROJECT_ROLE_HIERARCHY[minimum_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {minimum_role.value} role or higher",
            )

        return effective_role
    return Depends(_check)
