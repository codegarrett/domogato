from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.membership import OrgMembership
from app.models.organization import Organization
from app.models.user import User


def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or "org"


async def create_organization(
    db: AsyncSession,
    *,
    name: str,
    slug: str | None = None,
    description: str | None = None,
    avatar_url: str | None = None,
    settings: dict[str, Any] | None = None,
    creator_user_id: UUID,
) -> Organization:
    if slug is None:
        slug = generate_slug(name)

    existing = await get_organization_by_slug(db, slug)
    if existing is not None:
        raise ValueError(f"Organization with slug '{slug}' already exists")

    org = Organization(
        name=name,
        slug=slug,
        description=description,
        avatar_url=avatar_url,
        settings=settings or {},
    )
    db.add(org)
    await db.flush()

    membership = OrgMembership(
        user_id=creator_user_id,
        organization_id=org.id,
        role="owner",
    )
    db.add(membership)
    await db.flush()

    return org


async def get_organization(db: AsyncSession, org_id: UUID) -> Organization | None:
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    return result.scalar_one_or_none()


async def get_organization_by_slug(db: AsyncSession, slug: str) -> Organization | None:
    result = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    return result.scalar_one_or_none()


async def list_organizations_for_user(
    db: AsyncSession,
    user_id: UUID,
    *,
    is_system_admin: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Organization], int]:
    if is_system_admin:
        query = select(Organization).where(Organization.is_active == True)  # noqa: E712
    else:
        query = (
            select(Organization)
            .join(OrgMembership, OrgMembership.organization_id == Organization.id)
            .where(
                OrgMembership.user_id == user_id,
                Organization.is_active == True,  # noqa: E712
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Organization.name).offset(offset).limit(limit)
    result = await db.execute(query)
    orgs = list(result.scalars().all())

    return orgs, total


async def update_organization(
    db: AsyncSession, org_id: UUID, **kwargs: Any
) -> Organization | None:
    org = await get_organization(db, org_id)
    if org is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(org, key):
            setattr(org, key, value)
    await db.flush()
    await db.refresh(org)
    return org


async def deactivate_organization(db: AsyncSession, org_id: UUID) -> Organization | None:
    org = await get_organization(db, org_id)
    if org is None:
        return None
    org.is_active = False
    await db.flush()
    await db.refresh(org)
    return org


async def add_member(
    db: AsyncSession, org_id: UUID, user_id: UUID, role: str = "member"
) -> OrgMembership:
    existing = await get_member(db, org_id, user_id)
    if existing is not None:
        raise ValueError("User is already a member of this organization")

    membership = OrgMembership(
        user_id=user_id,
        organization_id=org_id,
        role=role,
    )
    db.add(membership)
    await db.flush()
    return membership


async def remove_member(db: AsyncSession, org_id: UUID, user_id: UUID) -> bool:
    membership = await get_member(db, org_id, user_id)
    if membership is None:
        return False
    await db.delete(membership)
    await db.flush()
    return True


async def update_member_role(
    db: AsyncSession, org_id: UUID, user_id: UUID, new_role: str
) -> OrgMembership | None:
    membership = await get_member(db, org_id, user_id)
    if membership is None:
        return None
    membership.role = new_role
    await db.flush()
    await db.refresh(membership)
    return membership


async def list_members(
    db: AsyncSession, org_id: UUID, *, offset: int = 0, limit: int = 50
) -> tuple[list[dict[str, Any]], int]:
    query = (
        select(OrgMembership, User)
        .join(User, User.id == OrgMembership.user_id)
        .where(OrgMembership.organization_id == org_id)
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
    db: AsyncSession, org_id: UUID, user_id: UUID
) -> OrgMembership | None:
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.organization_id == org_id,
            OrgMembership.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
