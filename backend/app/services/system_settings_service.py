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


EMBED_SETTING_KEYS = [
    "external_agent_enabled",
    "external_agent_allowed_origins",
]

EMBED_DEFAULTS: dict[str, Any] = {
    "external_agent_enabled": False,
    "external_agent_allowed_origins": [],
}

EMBED_ENV_MAP: dict[str, str] = {
    "external_agent_enabled": "EXTERNAL_AGENT_ENABLED",
    "external_agent_allowed_origins": "EXTERNAL_AGENT_ALLOWED_ORIGINS",
}

EMBED_ENV_DEFAULTS: dict[str, str] = {
    "EXTERNAL_AGENT_ENABLED": "",
    "EXTERNAL_AGENT_ALLOWED_ORIGINS": "",
}


def _parse_embed_env_value(key: str, raw: str) -> Any:
    if key == "external_agent_enabled":
        return raw.lower() in ("true", "1", "yes")
    if key == "external_agent_allowed_origins":
        return [o.strip() for o in raw.split(",") if o.strip()] if raw else []
    return raw


def _get_embed_env_value(key: str) -> tuple[Any, bool]:
    env_attr = EMBED_ENV_MAP.get(key)
    if not env_attr:
        return EMBED_DEFAULTS[key], False

    raw = getattr(settings, env_attr, "")
    default_raw = EMBED_ENV_DEFAULTS.get(env_attr, "")

    if raw and raw != default_raw:
        return _parse_embed_env_value(key, raw), True

    return EMBED_DEFAULTS[key], False


async def get_embed_db_settings(db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(EMBED_SETTING_KEYS))
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


async def get_effective_embed_settings(db: AsyncSession) -> dict[str, SettingValue]:
    db_settings = await get_embed_db_settings(db)
    result: dict[str, SettingValue] = {}

    for key in EMBED_SETTING_KEYS:
        env_val, env_set = _get_embed_env_value(key)

        if env_set:
            result[key] = SettingValue(value=env_val, source="env", env_locked=True)
        elif key in db_settings:
            val = db_settings[key]
            result[key] = SettingValue(value=val, source="database", env_locked=False)
        else:
            result[key] = SettingValue(value=EMBED_DEFAULTS[key], source="default", env_locked=False)

    return result


async def update_embed_settings(
    db: AsyncSession, updates: dict[str, Any], updated_by: UUID | None = None
) -> dict[str, SettingValue]:
    current = await get_effective_embed_settings(db)

    locked_keys = [k for k in updates if k in current and current[k].env_locked]
    if locked_keys:
        env_names = [EMBED_ENV_MAP.get(k, k) for k in locked_keys]
        raise ValueError(
            f"Cannot change settings locked by environment variables: {', '.join(env_names)}"
        )

    for key, value in updates.items():
        if key not in EMBED_SETTING_KEYS:
            continue
        stmt = pg_insert(SystemSetting).values(
            key=key, value=value, updated_by=updated_by, updated_at=func.now()
        ).on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_by": updated_by, "updated_at": func.now()},
        )
        await db.execute(stmt)
    await db.flush()

    return await get_effective_embed_settings(db)


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


AGENT_SKILL_SETTING_KEYS = ["agent_skill_secrets"]

AGENT_SKILL_DEFAULTS: dict[str, Any] = {
    "agent_skill_secrets": {},
}


async def get_agent_skill_db_settings(db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(AGENT_SKILL_SETTING_KEYS))
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


async def get_agent_skill_settings(db: AsyncSession) -> dict[str, Any]:
    db_settings = await get_agent_skill_db_settings(db)
    result = dict(AGENT_SKILL_DEFAULTS)
    result.update(db_settings)
    return result


async def set_agent_skill_settings(
    db: AsyncSession,
    updates: dict[str, Any],
    updated_by: UUID | None = None,
) -> dict[str, Any]:
    for key, value in updates.items():
        if key not in AGENT_SKILL_SETTING_KEYS:
            continue
        stmt = pg_insert(SystemSetting).values(
            key=key, value=value, updated_by=updated_by, updated_at=func.now()
        ).on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_by": updated_by, "updated_at": func.now()},
        )
        await db.execute(stmt)
    await db.flush()
    return await get_agent_skill_settings(db)


ACCESSIBILITY_SETTING_KEYS = [
    "accessibility_enabled",
    "accessibility_compliance_target",
    "accessibility_skip_link_enabled",
    "accessibility_landmark_labels_enabled",
    "accessibility_keyboard_drag_alternatives",
    "accessibility_board_keyboard_nav",
    "accessibility_timeline_keyboard_nav",
    "accessibility_respect_reduced_motion",
    "accessibility_enhanced_focus_indicators",
    "accessibility_high_contrast_available",
    "accessibility_live_region_verbosity",
    "accessibility_chart_data_tables",
    "accessibility_allow_user_motion_override",
    "accessibility_allow_user_contrast_override",
    "accessibility_allow_user_live_region_override",
    "accessibility_ci_audit_level",
]

ACCESSIBILITY_DEFAULTS: dict[str, Any] = {
    "accessibility_enabled": True,
    "accessibility_compliance_target": "wcag_2_2_aa",
    "accessibility_skip_link_enabled": True,
    "accessibility_landmark_labels_enabled": True,
    "accessibility_keyboard_drag_alternatives": False,
    "accessibility_board_keyboard_nav": False,
    "accessibility_timeline_keyboard_nav": False,
    "accessibility_respect_reduced_motion": True,
    "accessibility_enhanced_focus_indicators": False,
    "accessibility_high_contrast_available": False,
    "accessibility_live_region_verbosity": "minimal",
    "accessibility_chart_data_tables": False,
    "accessibility_allow_user_motion_override": True,
    "accessibility_allow_user_contrast_override": True,
    "accessibility_allow_user_live_region_override": False,
    "accessibility_ci_audit_level": "warnings",
}

ACCESSIBILITY_ENV_MAP: dict[str, str] = {
    "accessibility_enabled": "ACCESSIBILITY_ENABLED",
    "accessibility_compliance_target": "ACCESSIBILITY_COMPLIANCE_TARGET",
    "accessibility_skip_link_enabled": "ACCESSIBILITY_SKIP_LINK_ENABLED",
    "accessibility_landmark_labels_enabled": "ACCESSIBILITY_LANDMARK_LABELS_ENABLED",
    "accessibility_keyboard_drag_alternatives": "ACCESSIBILITY_KEYBOARD_DRAG_ALTERNATIVES",
    "accessibility_board_keyboard_nav": "ACCESSIBILITY_BOARD_KEYBOARD_NAV",
    "accessibility_timeline_keyboard_nav": "ACCESSIBILITY_TIMELINE_KEYBOARD_NAV",
    "accessibility_respect_reduced_motion": "ACCESSIBILITY_RESPECT_REDUCED_MOTION",
    "accessibility_enhanced_focus_indicators": "ACCESSIBILITY_ENHANCED_FOCUS_INDICATORS",
    "accessibility_high_contrast_available": "ACCESSIBILITY_HIGH_CONTRAST_AVAILABLE",
    "accessibility_live_region_verbosity": "ACCESSIBILITY_LIVE_REGION_VERBOSITY",
    "accessibility_chart_data_tables": "ACCESSIBILITY_CHART_DATA_TABLES",
    "accessibility_allow_user_motion_override": "ACCESSIBILITY_ALLOW_USER_MOTION_OVERRIDE",
    "accessibility_allow_user_contrast_override": "ACCESSIBILITY_ALLOW_USER_CONTRAST_OVERRIDE",
    "accessibility_allow_user_live_region_override": "ACCESSIBILITY_ALLOW_USER_LIVE_REGION_OVERRIDE",
    "accessibility_ci_audit_level": "ACCESSIBILITY_CI_AUDIT_LEVEL",
}

ACCESSIBILITY_ENV_DEFAULTS: dict[str, str] = {
    "ACCESSIBILITY_ENABLED": "",
    "ACCESSIBILITY_COMPLIANCE_TARGET": "",
    "ACCESSIBILITY_SKIP_LINK_ENABLED": "",
    "ACCESSIBILITY_LANDMARK_LABELS_ENABLED": "",
    "ACCESSIBILITY_KEYBOARD_DRAG_ALTERNATIVES": "",
    "ACCESSIBILITY_BOARD_KEYBOARD_NAV": "",
    "ACCESSIBILITY_TIMELINE_KEYBOARD_NAV": "",
    "ACCESSIBILITY_RESPECT_REDUCED_MOTION": "",
    "ACCESSIBILITY_ENHANCED_FOCUS_INDICATORS": "",
    "ACCESSIBILITY_HIGH_CONTRAST_AVAILABLE": "",
    "ACCESSIBILITY_LIVE_REGION_VERBOSITY": "",
    "ACCESSIBILITY_CHART_DATA_TABLES": "",
    "ACCESSIBILITY_ALLOW_USER_MOTION_OVERRIDE": "",
    "ACCESSIBILITY_ALLOW_USER_CONTRAST_OVERRIDE": "",
    "ACCESSIBILITY_ALLOW_USER_LIVE_REGION_OVERRIDE": "",
    "ACCESSIBILITY_CI_AUDIT_LEVEL": "",
}

_ACCESSIBILITY_BOOL_KEYS = {
    "accessibility_enabled",
    "accessibility_skip_link_enabled",
    "accessibility_landmark_labels_enabled",
    "accessibility_keyboard_drag_alternatives",
    "accessibility_board_keyboard_nav",
    "accessibility_timeline_keyboard_nav",
    "accessibility_respect_reduced_motion",
    "accessibility_enhanced_focus_indicators",
    "accessibility_high_contrast_available",
    "accessibility_chart_data_tables",
    "accessibility_allow_user_motion_override",
    "accessibility_allow_user_contrast_override",
    "accessibility_allow_user_live_region_override",
}


def _parse_accessibility_env_value(key: str, raw: str) -> Any:
    if key in _ACCESSIBILITY_BOOL_KEYS:
        return raw.lower() in ("true", "1", "yes")
    return raw


def _get_accessibility_env_value(key: str) -> tuple[Any, bool]:
    env_attr = ACCESSIBILITY_ENV_MAP.get(key)
    if not env_attr:
        return ACCESSIBILITY_DEFAULTS[key], False

    raw = getattr(settings, env_attr, "")
    default_raw = ACCESSIBILITY_ENV_DEFAULTS.get(env_attr, "")

    if raw and raw != default_raw:
        return _parse_accessibility_env_value(key, raw), True

    return ACCESSIBILITY_DEFAULTS[key], False


async def get_accessibility_db_settings(db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(ACCESSIBILITY_SETTING_KEYS))
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


async def get_effective_accessibility_settings(db: AsyncSession) -> dict[str, SettingValue]:
    db_settings = await get_accessibility_db_settings(db)
    result: dict[str, SettingValue] = {}

    for key in ACCESSIBILITY_SETTING_KEYS:
        env_val, env_set = _get_accessibility_env_value(key)

        if env_set:
            result[key] = SettingValue(value=env_val, source="env", env_locked=True)
        elif key in db_settings:
            val = db_settings[key]
            result[key] = SettingValue(value=val, source="database", env_locked=False)
        else:
            result[key] = SettingValue(
                value=ACCESSIBILITY_DEFAULTS[key], source="default", env_locked=False
            )

    return result


def get_public_accessibility_config(settings_dict: dict[str, SettingValue]) -> dict[str, Any]:
    """Return client-facing accessibility config (values only, no source metadata)."""
    return {key: settings_dict[key].value for key in ACCESSIBILITY_SETTING_KEYS if key in settings_dict}


async def update_accessibility_settings(
    db: AsyncSession, updates: dict[str, Any], updated_by: UUID | None = None
) -> dict[str, SettingValue]:
    current = await get_effective_accessibility_settings(db)

    locked_keys = [k for k in updates if k in current and current[k].env_locked]
    if locked_keys:
        env_names = [ACCESSIBILITY_ENV_MAP.get(k, k) for k in locked_keys]
        raise ValueError(
            f"Cannot change settings locked by environment variables: {', '.join(env_names)}"
        )

    valid_verbosity = {"off", "minimal", "standard", "verbose"}
    if "accessibility_live_region_verbosity" in updates:
        val = updates["accessibility_live_region_verbosity"]
        if val not in valid_verbosity:
            raise ValueError(
                f"accessibility_live_region_verbosity must be one of: {', '.join(sorted(valid_verbosity))}"
            )

    valid_ci_levels = {"none", "warnings", "blocking"}
    if "accessibility_ci_audit_level" in updates:
        val = updates["accessibility_ci_audit_level"]
        if val not in valid_ci_levels:
            raise ValueError(
                f"accessibility_ci_audit_level must be one of: {', '.join(sorted(valid_ci_levels))}"
            )

    for key, value in updates.items():
        if key not in ACCESSIBILITY_SETTING_KEYS:
            continue
        stmt = pg_insert(SystemSetting).values(
            key=key, value=value, updated_by=updated_by, updated_at=func.now()
        ).on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_by": updated_by, "updated_at": func.now()},
        )
        await db.execute(stmt)
    await db.flush()

    return await get_effective_accessibility_settings(db)
