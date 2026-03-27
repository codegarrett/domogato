from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.membership import OrgMembership, ProjectMembership
from app.models.project import Project
from app.models.user import User


async def create_project(
    db: AsyncSession,
    *,
    org_id: UUID,
    name: str,
    key: str,
    description: str | None = None,
    visibility: str = "private",
    settings: dict[str, Any] | None = None,
    creator_user_id: UUID,
) -> Project:
    existing = await db.execute(
        select(Project).where(
            Project.organization_id == org_id,
            Project.key == key,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError(f"Project with key '{key}' already exists in this organization")

    project = Project(
        organization_id=org_id,
        name=name,
        key=key,
        description=description,
        visibility=visibility,
        settings=settings or {},
    )
    db.add(project)
    await db.flush()

    membership = ProjectMembership(
        user_id=creator_user_id,
        project_id=project.id,
        role="owner",
    )
    db.add(membership)
    await db.flush()

    return project


async def get_project(db: AsyncSession, project_id: UUID) -> Project | None:
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    return result.scalar_one_or_none()


async def list_projects_for_user(
    db: AsyncSession,
    org_id: UUID,
    user_id: UUID,
    *,
    is_system_admin: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Project], int]:
    base = select(Project).where(
        Project.organization_id == org_id,
        Project.is_archived == False,  # noqa: E712
    )

    if is_system_admin:
        query = base
    else:
        org_membership = await db.execute(
            select(OrgMembership.role).where(
                OrgMembership.user_id == user_id,
                OrgMembership.organization_id == org_id,
            )
        )
        org_role = org_membership.scalar_one_or_none()

        if org_role in ("owner", "admin"):
            query = base
        elif org_role == "member":
            project_ids_subq = (
                select(ProjectMembership.project_id)
                .where(ProjectMembership.user_id == user_id)
                .scalar_subquery()
            )
            query = base.where(
                or_(
                    Project.visibility.in_(["internal", "public"]),
                    Project.id.in_(project_ids_subq),
                )
            )
        else:
            project_ids_subq = (
                select(ProjectMembership.project_id)
                .where(ProjectMembership.user_id == user_id)
                .scalar_subquery()
            )
            query = base.where(
                or_(
                    Project.visibility == "public",
                    Project.id.in_(project_ids_subq),
                )
            )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Project.name).offset(offset).limit(limit)
    result = await db.execute(query)
    projects = list(result.scalars().all())

    return projects, total


async def update_project(
    db: AsyncSession, project_id: UUID, **kwargs: Any
) -> Project | None:
    project = await get_project(db, project_id)
    if project is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(project, key):
            setattr(project, key, value)
    await db.flush()
    await db.refresh(project)
    return project


async def archive_project(db: AsyncSession, project_id: UUID) -> Project | None:
    project = await get_project(db, project_id)
    if project is None:
        return None
    project.is_archived = True
    await db.flush()
    await db.refresh(project)
    return project


async def unarchive_project(db: AsyncSession, project_id: UUID) -> Project | None:
    project = await get_project(db, project_id)
    if project is None:
        return None
    project.is_archived = False
    await db.flush()
    await db.refresh(project)
    return project


async def add_member(
    db: AsyncSession, project_id: UUID, user_id: UUID, role: str = "developer"
) -> ProjectMembership:
    existing = await get_member(db, project_id, user_id)
    if existing is not None:
        raise ValueError("User is already a member of this project")

    membership = ProjectMembership(
        user_id=user_id,
        project_id=project_id,
        role=role,
    )
    db.add(membership)
    await db.flush()
    return membership


async def remove_member(db: AsyncSession, project_id: UUID, user_id: UUID) -> bool:
    membership = await get_member(db, project_id, user_id)
    if membership is None:
        return False
    await db.delete(membership)
    await db.flush()
    return True


async def update_member_role(
    db: AsyncSession, project_id: UUID, user_id: UUID, new_role: str
) -> ProjectMembership | None:
    membership = await get_member(db, project_id, user_id)
    if membership is None:
        return None
    membership.role = new_role
    await db.flush()
    await db.refresh(membership)
    return membership


async def list_members(
    db: AsyncSession, project_id: UUID, *, offset: int = 0, limit: int = 50
) -> tuple[list[dict[str, Any]], int]:
    query = (
        select(ProjectMembership, User)
        .join(User, User.id == ProjectMembership.user_id)
        .where(ProjectMembership.project_id == project_id)
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(User.display_name).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    members = []
    for membership, user in rows:
        members.append({
            "id": membership.id,
            "user_id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "role": membership.role,
            "created_at": membership.created_at,
        })

    return members, total


async def get_member(
    db: AsyncSession, project_id: UUID, user_id: UUID
) -> ProjectMembership | None:
    result = await db.execute(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
