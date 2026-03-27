from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.models.system_setting import SystemSetting


AUTH_SETTING_KEYS = [
    "auth_mode",
    "local_registration_enabled",
    "oidc_issuer_url",
    "oidc_client_id",
    "oidc_client_secret",
    "oidc_auto_provision",
    "oidc_allowed_domains",
    "oidc_default_org_id",
    "oidc_admin_claim",
]

DEFAULTS: dict[str, Any] = {
    "auth_mode": "local",
    "local_registration_enabled": False,
    "oidc_issuer_url": "",
    "oidc_client_id": "",
    "oidc_client_secret": "",
    "oidc_auto_provision": True,
    "oidc_allowed_domains": [],
    "oidc_default_org_id": None,
    "oidc_admin_claim": "projecthub-admin",
}

_ENV_MAP: dict[str, str] = {
    "auth_mode": "AUTH_MODE",
    "local_registration_enabled": "LOCAL_REGISTRATION_ENABLED",
    "oidc_issuer_url": "OIDC_ISSUER_URL",
    "oidc_client_id": "OIDC_CLIENT_ID",
    "oidc_client_secret": "OIDC_CLIENT_SECRET",
    "oidc_auto_provision": "OIDC_AUTO_PROVISION",
    "oidc_allowed_domains": "OIDC_ALLOWED_DOMAINS",
    "oidc_default_org_id": "OIDC_DEFAULT_ORG_ID",
    "oidc_admin_claim": "OIDC_ADMIN_CLAIM",
}

# Known defaults for env vars so we can detect "explicitly set"
_ENV_DEFAULTS: dict[str, str] = {
    "AUTH_MODE": "",
    "LOCAL_REGISTRATION_ENABLED": "",
    "OIDC_ISSUER_URL": "https://keycloak.example.com/realms/projecthub",
    "OIDC_CLIENT_ID": "projecthub-backend",
    "OIDC_CLIENT_SECRET": "change-me",
    "OIDC_AUTO_PROVISION": "",
    "OIDC_ALLOWED_DOMAINS": "",
    "OIDC_DEFAULT_ORG_ID": "",
    "OIDC_ADMIN_CLAIM": "",
}


@dataclass
class SettingValue:
    value: Any
    source: str  # "env", "database", "default"
    env_locked: bool = False


def _parse_env_value(key: str, raw: str) -> Any:
    """Convert a raw env var string to the appropriate Python type for a setting key."""
    if key in ("local_registration_enabled", "oidc_auto_provision"):
        return raw.lower() in ("true", "1", "yes")
    if key == "oidc_allowed_domains":
        return [d.strip() for d in raw.split(",") if d.strip()] if raw else []
    if key == "oidc_default_org_id":
        return raw if raw else None
    return raw


def _get_env_value(key: str) -> tuple[Any, bool]:
    """Return (parsed_value, is_explicitly_set) for the given setting key from env vars."""
    env_attr = _ENV_MAP.get(key)
    if not env_attr:
        return DEFAULTS[key], False

    raw = getattr(settings, env_attr, "")
    default_raw = _ENV_DEFAULTS.get(env_attr, "")

    if raw and raw != default_raw:
        return _parse_env_value(key, raw), True

    return DEFAULTS[key], False


async def get_db_settings(db: AsyncSession) -> dict[str, Any]:
    """Read all auth-related settings from the database."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(AUTH_SETTING_KEYS))
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


async def get_effective_auth_settings(db: AsyncSession) -> dict[str, SettingValue]:
    """
    Merge env vars, DB values, and defaults. Priority: env > db > default.
    Returns a dict of key -> SettingValue with source annotation.
    """
    db_settings = await get_db_settings(db)
    result: dict[str, SettingValue] = {}

    for key in AUTH_SETTING_KEYS:
        env_val, env_set = _get_env_value(key)

        if env_set:
            result[key] = SettingValue(value=env_val, source="env", env_locked=True)
        elif key in db_settings:
            val = db_settings[key]
            result[key] = SettingValue(value=val, source="database", env_locked=False)
        else:
            result[key] = SettingValue(value=DEFAULTS[key], source="default", env_locked=False)

    return result


async def get_effective_value(db: AsyncSession, key: str) -> Any:
    """Get a single effective setting value (convenience shortcut)."""
    all_settings = await get_effective_auth_settings(db)
    sv = all_settings.get(key)
    return sv.value if sv else DEFAULTS.get(key)


async def update_auth_settings(
    db: AsyncSession, updates: dict[str, Any], updated_by: UUID | None = None
) -> dict[str, SettingValue]:
    """
    Update auth settings in the database. Only non-env-locked keys can be changed.
    Returns the new effective settings.
    """
    current = await get_effective_auth_settings(db)

    locked_keys = [k for k in updates if k in current and current[k].env_locked]
    if locked_keys:
        env_names = [_ENV_MAP.get(k, k) for k in locked_keys]
        raise ValueError(
            f"Cannot change settings locked by environment variables: {', '.join(env_names)}"
        )

    for key, value in updates.items():
        if key not in AUTH_SETTING_KEYS:
            continue
        stmt = pg_insert(SystemSetting).values(
            key=key, value=value, updated_by=updated_by, updated_at=func.now()
        ).on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_by": updated_by, "updated_at": func.now()},
        )
        await db.execute(stmt)
    await db.flush()

    return await get_effective_auth_settings(db)


async def has_system_admin(db: AsyncSession) -> bool:
    """Check if at least one system admin user exists."""
    from app.models.user import User
    result = await db.execute(
        select(func.count()).select_from(
            select(User.id).where(User.is_system_admin == True, User.is_active == True).subquery()  # noqa: E712
        )
    )
    return result.scalar_one() > 0


async def needs_setup(db: AsyncSession) -> bool:
    """Check if initial setup is required (no admin and no INITIAL_ADMIN_EMAIL)."""
    if settings.INITIAL_ADMIN_EMAIL:
        return False
    return not await has_system_admin(db)
