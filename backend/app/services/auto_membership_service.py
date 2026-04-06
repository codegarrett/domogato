from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.membership import OrgMembership, ProjectMembership
from app.models.organization import Organization
from app.models.project import Project
from app.models.user import User


async def apply_auto_join_for_new_user(db: AsyncSession, user_id: UUID) -> None:
    """Auto-add a newly created user to orgs with auto_join_new_users or default_org enabled,
    then cascade into projects with auto_add_org_members."""
    orgs = (
        await db.execute(
            select(Organization.id).where(
                Organization.is_active == True,  # noqa: E712
                (
                    Organization.settings["auto_join_new_users"].as_boolean()
                    | Organization.settings["default_org"].as_boolean()
                ),
            )
        )
    ).scalars().all()

    for org_id in orgs:
        stmt = (
            pg_insert(OrgMembership)
            .values(user_id=user_id, organization_id=org_id, role="member")
            .on_conflict_do_nothing(constraint="uq_org_memberships_user_org")
        )
        await db.execute(stmt)

        await _auto_add_to_projects(db, user_id, org_id)

    await db.flush()


async def apply_default_org_bulk(db: AsyncSession, org_id: UUID) -> None:
    """Bulk-add all active users to an org, then cascade into auto-add projects."""
    user_ids = (
        await db.execute(
            select(User.id).where(User.is_active == True)  # noqa: E712
        )
    ).scalars().all()

    for uid in user_ids:
        stmt = (
            pg_insert(OrgMembership)
            .values(user_id=uid, organization_id=org_id, role="member")
            .on_conflict_do_nothing(constraint="uq_org_memberships_user_org")
        )
        await db.execute(stmt)

    project_ids = (
        await db.execute(
            select(Project.id).where(
                Project.organization_id == org_id,
                Project.is_archived == False,  # noqa: E712
                Project.settings["auto_add_org_members"].as_boolean(),
            )
        )
    ).scalars().all()

    for pid in project_ids:
        for uid in user_ids:
            stmt = (
                pg_insert(ProjectMembership)
                .values(user_id=uid, project_id=pid, role="member")
                .on_conflict_do_nothing(constraint="uq_project_memberships_user_project")
            )
            await db.execute(stmt)

    await db.flush()


async def apply_auto_add_project_bulk(
    db: AsyncSession, project_id: UUID, org_id: UUID
) -> None:
    """Bulk-add all org members to a project."""
    member_user_ids = (
        await db.execute(
            select(OrgMembership.user_id).where(
                OrgMembership.organization_id == org_id
            )
        )
    ).scalars().all()

    for uid in member_user_ids:
        stmt = (
            pg_insert(ProjectMembership)
            .values(user_id=uid, project_id=project_id, role="member")
            .on_conflict_do_nothing(constraint="uq_project_memberships_user_project")
        )
        await db.execute(stmt)

    await db.flush()


async def apply_auto_projects_for_new_org_member(
    db: AsyncSession, user_id: UUID, org_id: UUID
) -> None:
    """When a user joins an org, auto-add them to projects with auto_add_org_members."""
    await _auto_add_to_projects(db, user_id, org_id)
    await db.flush()


async def _auto_add_to_projects(
    db: AsyncSession, user_id: UUID, org_id: UUID
) -> None:
    """Add user to all auto-add projects within an org."""
    project_ids = (
        await db.execute(
            select(Project.id).where(
                Project.organization_id == org_id,
                Project.is_archived == False,  # noqa: E712
                Project.settings["auto_add_org_members"].as_boolean(),
            )
        )
    ).scalars().all()

    for pid in project_ids:
        stmt = (
            pg_insert(ProjectMembership)
            .values(user_id=user_id, project_id=pid, role="member")
            .on_conflict_do_nothing(constraint="uq_project_memberships_user_project")
        )
        await db.execute(stmt)
