"""Secret storage for custom agent skills."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import system_settings_service

AGENT_SECRETS_KEY = "agent_skill_secrets"
PROJECT_SECRETS_SETTINGS_KEY = "agent_secrets"


async def get_global_secrets(db: AsyncSession) -> dict[str, str]:
    settings = await system_settings_service.get_agent_skill_settings(db)
    raw = settings.get(AGENT_SECRETS_KEY) or {}
    if not isinstance(raw, dict):
        return {}
    return {str(k): str(v) for k, v in raw.items()}


async def set_global_secret(db: AsyncSession, key: str, value: str, updated_by: UUID) -> None:
    settings = await system_settings_service.get_agent_skill_settings(db)
    secrets = dict(settings.get(AGENT_SECRETS_KEY) or {})
    secrets[key] = value
    await system_settings_service.set_agent_skill_settings(
        db, {AGENT_SECRETS_KEY: secrets}, updated_by=updated_by
    )


async def delete_global_secret(db: AsyncSession, key: str, updated_by: UUID) -> None:
    settings = await system_settings_service.get_agent_skill_settings(db)
    secrets = dict(settings.get(AGENT_SECRETS_KEY) or {})
    secrets.pop(key, None)
    await system_settings_service.set_agent_skill_settings(
        db, {AGENT_SECRETS_KEY: secrets}, updated_by=updated_by
    )


async def list_global_secret_keys(db: AsyncSession) -> list[str]:
    secrets = await get_global_secrets(db)
    return sorted(secrets.keys())


async def get_project_secrets(db: AsyncSession, project_id: UUID) -> dict[str, str]:
    from app.services import project_service

    project = await project_service.get_project(db, project_id)
    if project is None:
        return {}
    raw = project.settings.get(PROJECT_SECRETS_SETTINGS_KEY) or {}
    if not isinstance(raw, dict):
        return {}
    return {str(k): str(v) for k, v in raw.items()}


async def set_project_secret(
    db: AsyncSession, project_id: UUID, key: str, value: str
) -> None:
    from app.services import project_service

    project = await project_service.get_project(db, project_id)
    if project is None:
        return
    settings = dict(project.settings)
    secrets = dict(settings.get(PROJECT_SECRETS_SETTINGS_KEY) or {})
    secrets[key] = value
    settings[PROJECT_SECRETS_SETTINGS_KEY] = secrets
    await project_service.update_project(db, project_id, settings=settings)


async def delete_project_secret(db: AsyncSession, project_id: UUID, key: str) -> None:
    from app.services import project_service

    project = await project_service.get_project(db, project_id)
    if project is None:
        return
    settings = dict(project.settings)
    secrets = dict(settings.get(PROJECT_SECRETS_SETTINGS_KEY) or {})
    secrets.pop(key, None)
    if secrets:
        settings[PROJECT_SECRETS_SETTINGS_KEY] = secrets
    else:
        settings.pop(PROJECT_SECRETS_SETTINGS_KEY, None)
    await project_service.update_project(db, project_id, settings=settings)


async def list_project_secret_keys(db: AsyncSession, project_id: UUID) -> list[str]:
    secrets = await get_project_secrets(db, project_id)
    return sorted(secrets.keys())
