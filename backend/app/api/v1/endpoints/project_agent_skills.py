"""Project-scoped custom agent skill endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
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
    delete_project_secret,
    get_project_secret_value,
    list_project_secret_keys,
    set_project_secret,
)

router = APIRouter(tags=["agent-skills"])


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


@router.get("/projects/{project_id}/agent-skills", response_model=list[AgentSkillListItem])
async def list_project_agent_skills(
    project_id: UUID,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    rows = await agent_skill_service.list_skills(db, project_id=project_id)
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


@router.post(
    "/projects/{project_id}/agent-skills/generate",
    response_model=AgentSkillGenerateResponse,
)
async def generate_project_agent_skill(
    project_id: UUID,
    body: AgentSkillGenerateRequest,
    _role=require_project_role(ProjectRole.MAINTAINER),
):
    result = await generate_agent_skill_md(
        prompt=body.prompt,
        current_content_md=body.current_content_md,
        display_name=body.display_name,
    )
    return AgentSkillGenerateResponse(**result)


@router.post(
    "/projects/{project_id}/agent-skills/validate",
    response_model=AgentSkillValidateResponse,
)
async def validate_project_agent_skill(
    project_id: UUID,
    body: AgentSkillValidateRequest,
    _role=require_project_role(ProjectRole.MAINTAINER),
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


@router.get("/projects/{project_id}/agent-skills-secrets", response_model=AgentSecretsRead)
async def list_project_agent_secrets(
    project_id: UUID,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    keys = await list_project_secret_keys(db, project_id)
    return AgentSecretsRead(keys=keys)


@router.get("/projects/{project_id}/agent-skills-secrets/{key}", response_model=AgentSecretValue)
async def reveal_project_agent_secret(
    project_id: UUID,
    key: str,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    normalized = key.strip().upper()
    value = await get_project_secret_value(db, project_id, normalized)
    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")
    return AgentSecretValue(key=normalized, value=value)


@router.put("/projects/{project_id}/agent-skills-secrets", status_code=status.HTTP_204_NO_CONTENT)
async def set_project_agent_secret(
    project_id: UUID,
    body: AgentSecretSet,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    await set_project_secret(db, project_id, body.key, body.value)


@router.delete(
    "/projects/{project_id}/agent-skills-secrets",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_agent_secret(
    project_id: UUID,
    body: AgentSecretDelete,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    await delete_project_secret(db, project_id, body.key)


@router.get("/projects/{project_id}/agent-skills/{slug}", response_model=AgentSkillDetail)
async def get_project_agent_skill(
    project_id: UUID,
    slug: str,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    row = await agent_skill_service.get_skill(db, slug=slug, project_id=project_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    parsed = parse_agent_skill_md(row.content_md)
    return _to_detail(row, parsed)


@router.put("/projects/{project_id}/agent-skills/{slug}", response_model=AgentSkillDetail)
async def upsert_project_agent_skill(
    project_id: UUID,
    slug: str,
    body: AgentSkillUpsert,
    user: User = Depends(get_current_user),
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    row, parsed = await agent_skill_service.upsert_skill(
        db,
        slug=slug,
        name=body.name,
        content_md=body.content_md,
        project_id=project_id,
        updated_by_id=user.id,
        enabled=body.enabled,
    )
    return _to_detail(row, parsed)


@router.delete(
    "/projects/{project_id}/agent-skills/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_agent_skill(
    project_id: UUID,
    slug: str,
    _role=require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    await agent_skill_service.delete_skill(db, slug=slug, project_id=project_id)
