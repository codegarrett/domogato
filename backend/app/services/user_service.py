from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.user import User
from app.models.membership import OrgMembership, ProjectMembership


async def get_or_create_user(db: AsyncSession, token_claims: dict[str, Any]) -> User:
    """JIT user provisioning: create or update user from OIDC token claims.
    Respects provisioning settings from system_settings.
    """
    from app.services.system_settings_service import get_effective_auth_settings

    subject = token_claims["sub"]
    result = await db.execute(
        select(User).where(User.oidc_subject == subject)
    )
    user = result.scalar_one_or_none()

    auth_settings = await get_effective_auth_settings(db)
    admin_claim = auth_settings["oidc_admin_claim"].value or "projecthub-admin"
    realm_roles = token_claims.get("realm_access", {}).get("roles", [])
    is_admin = admin_claim in realm_roles

    email = token_claims.get("email", f"{subject}@unknown")

    if user is None:
        # Check auto-provisioning
        if not auth_settings["oidc_auto_provision"].value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Auto-provisioning is disabled. Contact your administrator for access.",
            )

        # Check domain whitelist
        allowed_domains = auth_settings["oidc_allowed_domains"].value
        if allowed_domains:
            domain = email.rsplit("@", 1)[-1].lower()
            allowed = [d.lower() for d in allowed_domains]
            if domain not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Email domain '{domain}' is not allowed. Contact your administrator.",
                )

        # Check INITIAL_ADMIN_EMAIL promotion
        if settings.INITIAL_ADMIN_EMAIL and email.lower() == settings.INITIAL_ADMIN_EMAIL.lower():
            is_admin = True

        user = User(
            oidc_subject=subject,
            email=email,
            display_name=token_claims.get("name", token_claims.get("preferred_username", "Unknown")),
            avatar_url=token_claims.get("picture"),
            is_system_admin=is_admin,
            last_login_at=func.now(),
        )
        db.add(user)
        await db.flush()

        # Auto-assign to default org
        default_org_id = auth_settings["oidc_default_org_id"].value
        if default_org_id:
            from app.models.membership import OrgMembership as OM
            membership = OM(
                user_id=user.id,
                organization_id=UUID(default_org_id),
                role="member",
            )
            db.add(membership)
            await db.flush()
    else:
        if email_val := token_claims.get("email"):
            user.email = email_val
        if name := token_claims.get("name"):
            user.display_name = name
        elif preferred := token_claims.get("preferred_username"):
            user.display_name = preferred
        if picture := token_claims.get("picture"):
            user.avatar_url = picture
        user.is_system_admin = is_admin

        # Check INITIAL_ADMIN_EMAIL promotion on login
        if settings.INITIAL_ADMIN_EMAIL and user.email.lower() == settings.INITIAL_ADMIN_EMAIL.lower():
            user.is_system_admin = True

        user.last_login_at = func.now()

    return user


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_with_memberships(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.org_memberships).selectinload(OrgMembership.organization),
            selectinload(User.project_memberships).selectinload(ProjectMembership.project),
        )
    )
    return result.scalar_one_or_none()


async def list_users(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 50,
    search: str | None = None,
    include_inactive: bool = False,
) -> tuple[list[User], int]:
    query = select(User)
    if not include_inactive:
        query = query.where(User.is_active == True)  # noqa: E712

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.display_name.ilike(search_filter)) | (User.email.ilike(search_filter))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(User.display_name).offset(offset).limit(limit)
    result = await db.execute(query)
    users = list(result.scalars().all())

    return users, total


async def update_user_preferences(db: AsyncSession, user: User, preferences: dict[str, Any]) -> User:
    current = user.preferences if user.preferences else {}
    user.preferences = {**current, **preferences}
    await db.flush()
    await db.refresh(user)
    return user


async def update_user_profile(db: AsyncSession, user: User, **kwargs: Any) -> User:
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user
