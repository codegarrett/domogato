"""System-admin endpoints for global custom agent skills."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.permissions import require_system_admin
from app.models.user import User
from app.schemas.agent_skill import (
    AgentSecretDelete,
    AgentSecretSet,
    AgentSecretValue,
    AgentSecretsRead,
    AgentSkillDetail,
    AgentSkillGenerateRequest,
    AgentSkillGenerateResponse,
    AgentSkillListItem,
    AgentSkillUpsert,
    AgentSkillValidateRequest,
    AgentSkillValidateResponse,
)
from app.services import agent_skill_service
from app.services.agent_skill_generate_service import generate_agent_skill_md
from app.services.agent_skill_parser import parse_agent_skill_md
from app.services.agent_skill_secrets import (
    delete_global_secret,
    get_global_secret_value,
    list_global_secret_keys,
    set_global_secret,
)

router = APIRouter(prefix="/admin/agent-skills", tags=["admin-agent-skills"])


def _to_list_item(row, parsed) -> AgentSkillListItem:
    return AgentSkillListItem(
        id=row.id,
        slug=row.slug,
        name=row.name,
        enabled=row.enabled,
        tool_name=parsed.tool_name,
        updated_at=row.updated_at,
    )


def _to_detail(row, parsed) -> AgentSkillDetail:
    return AgentSkillDetail(
        id=row.id,
        slug=row.slug,
        name=row.name,
        content_md=row.content_md,
        enabled=row.enabled,
        tool_name=parsed.tool_name,
        description=parsed.description,
        category=parsed.category,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[AgentSkillListItem])
async def list_global_agent_skills(
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    rows = await agent_skill_service.list_skills(db, project_id=None)
    items = []
    for row in rows:
        try:
            parsed = parse_agent_skill_md(row.content_md)
            items.append(_to_list_item(row, parsed))
        except HTTPException:
            items.append(
                AgentSkillListItem(
                    id=row.id,
                    slug=row.slug,
                    name=row.name,
                    enabled=row.enabled,
                    tool_name=None,
                    updated_at=row.updated_at,
                )
            )
    return items


@router.post("/generate", response_model=AgentSkillGenerateResponse)
async def generate_global_agent_skill(
    body: AgentSkillGenerateRequest,
    _admin: User = require_system_admin(),
):
    result = await generate_agent_skill_md(
        prompt=body.prompt,
        current_content_md=body.current_content_md,
        display_name=body.display_name,
    )
    return AgentSkillGenerateResponse(**result)


@router.post("/validate", response_model=AgentSkillValidateResponse)
async def validate_global_agent_skill(
    body: AgentSkillValidateRequest,
    _admin: User = require_system_admin(),
):
    try:
        parsed = parse_agent_skill_md(body.content_md)
    except HTTPException as exc:
        return AgentSkillValidateResponse(valid=False, errors=[str(exc.detail)])
    return AgentSkillValidateResponse(
        valid=True,
        tool_name=parsed.tool_name,
        description=parsed.description,
        category=parsed.category,
    )


@router.get("/secrets", response_model=AgentSecretsRead)
async def list_global_agent_secrets(
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    keys = await list_global_secret_keys(db)
    return AgentSecretsRead(keys=keys)


@router.get("/secrets/{key}", response_model=AgentSecretValue)
async def reveal_global_agent_secret(
    key: str,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    normalized = key.strip().upper()
    value = await get_global_secret_value(db, normalized)
    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")
    return AgentSecretValue(key=normalized, value=value)


@router.put("/secrets", status_code=status.HTTP_204_NO_CONTENT)
async def set_global_agent_secret(
    body: AgentSecretSet,
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    await set_global_secret(db, body.key, body.value, admin.id)


@router.delete("/secrets", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_agent_secret(
    body: AgentSecretDelete,
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    await delete_global_secret(db, body.key, admin.id)


@router.get("/{slug}", response_model=AgentSkillDetail)
async def get_global_agent_skill(
    slug: str,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    row = await agent_skill_service.get_skill(db, slug=slug, project_id=None)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    parsed = parse_agent_skill_md(row.content_md)
    return _to_detail(row, parsed)


@router.put("/{slug}", response_model=AgentSkillDetail)
async def upsert_global_agent_skill(
    slug: str,
    body: AgentSkillUpsert,
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    row, parsed = await agent_skill_service.upsert_skill(
        db,
        slug=slug,
        name=body.name,
        content_md=body.content_md,
        project_id=None,
        updated_by_id=admin.id,
        enabled=body.enabled,
    )
    return _to_detail(row, parsed)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_agent_skill(
    slug: str,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    await agent_skill_service.delete_skill(db, slug=slug, project_id=None)
