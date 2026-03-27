from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    require_project_role,
    resolve_effective_project_role,
)
from app.models.kb_template import KBTemplate
from app.models.project import Project
from app.models.user import User
from app.schemas.kb import TemplateCreate, TemplateRead, TemplateUpdate

router = APIRouter(tags=["knowledge-base"])


async def _require_template_role(
    db: AsyncSession, template: KBTemplate, user: User, min_role: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    if template.project_id is None:
        return
    result = await db.execute(select(Project).where(Project.id == template.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=template.project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )


@router.get(
    "/projects/{project_id}/kb/templates",
    response_model=list[TemplateRead],
)
async def list_templates(
    project_id: UUID,
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBTemplate)
        .where(
            or_(
                KBTemplate.project_id == project_id,
                KBTemplate.project_id.is_(None),
            )
        )
        .order_by(KBTemplate.is_builtin.desc(), KBTemplate.name)
    )
    templates = result.scalars().all()
    return [TemplateRead.model_validate(t) for t in templates]


@router.post(
    "/projects/{project_id}/kb/templates",
    response_model=TemplateRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    project_id: UUID,
    body: TemplateCreate,
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = KBTemplate(
        project_id=project_id,
        name=body.name,
        description=body.description,
        content_markdown=body.content_markdown,
        content_html=body.content_html,
        icon=body.icon,
        is_builtin=False,
        created_by=user.id,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return TemplateRead.model_validate(template)


@router.get(
    "/kb/templates/{template_id}",
    response_model=TemplateRead,
)
async def get_template(
    template_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBTemplate).where(KBTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    await _require_template_role(db, template, user, ProjectRole.GUEST)
    return TemplateRead.model_validate(template)


@router.patch(
    "/kb/templates/{template_id}",
    response_model=TemplateRead,
)
async def update_template(
    template_id: UUID,
    body: TemplateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBTemplate).where(KBTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.is_builtin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a built-in template",
        )
    await _require_template_role(db, template, user, ProjectRole.MAINTAINER)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    await db.flush()
    await db.refresh(template)
    return TemplateRead.model_validate(template)


@router.delete(
    "/kb/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_template(
    template_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBTemplate).where(KBTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.is_builtin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a built-in template",
        )
    await _require_template_role(db, template, user, ProjectRole.MAINTAINER)
    await db.delete(template)
    await db.flush()


async def seed_builtin_templates(db: AsyncSession) -> None:
    existing = (
        await db.execute(
            select(func.count())
            .select_from(KBTemplate)
            .where(KBTemplate.is_builtin == True)  # noqa: E712
        )
    ).scalar_one()
    if existing > 0:
        return

    templates = [
        KBTemplate(
            name="Blank Page",
            description="A clean slate to start from scratch.",
            content_markdown="",
            content_html="",
            icon="file-text",
            is_builtin=True,
        ),
        KBTemplate(
            name="Meeting Notes",
            description="Structured template for meeting minutes.",
            content_markdown=(
                "# Meeting Notes\n\n"
                "**Date:** \n**Attendees:** \n\n"
                "## Agenda\n\n- \n\n"
                "## Discussion\n\n\n\n"
                "## Action Items\n\n"
                "| Owner | Task | Due Date |\n"
                "|-------|------|----------|\n"
                "|       |      |          |\n"
            ),
            content_html="",
            icon="users",
            is_builtin=True,
        ),
        KBTemplate(
            name="Decision Record",
            description="Document architectural or process decisions.",
            content_markdown=(
                "# Decision Record\n\n"
                "**Status:** Proposed | Accepted | Deprecated\n\n"
                "## Context\n\nDescribe the context and problem.\n\n"
                "## Decision\n\nDescribe the decision made.\n\n"
                "## Consequences\n\nDescribe the resulting consequences.\n"
            ),
            content_html="",
            icon="git-branch",
            is_builtin=True,
        ),
        KBTemplate(
            name="How-To Guide",
            description="Step-by-step instructions for a procedure.",
            content_markdown=(
                "# How-To Guide\n\n"
                "## Overview\n\nBrief description of what this guide covers.\n\n"
                "## Prerequisites\n\n- \n\n"
                "## Steps\n\n"
                "### Step 1\n\n\n\n"
                "### Step 2\n\n\n\n"
                "## Troubleshooting\n\n"
            ),
            content_html="",
            icon="book-open",
            is_builtin=True,
        ),
        KBTemplate(
            name="API Documentation",
            description="Document a REST API endpoint.",
            content_markdown=(
                "# API Documentation\n\n"
                "## Endpoint\n\n"
                "`METHOD /path`\n\n"
                "## Description\n\n\n\n"
                "## Request\n\n"
                "### Headers\n\n"
                "| Header | Value | Required |\n"
                "|--------|-------|----------|\n"
                "|        |       |          |\n\n"
                "### Body\n\n```json\n{\n}\n```\n\n"
                "## Response\n\n```json\n{\n}\n```\n\n"
                "## Error Codes\n\n"
                "| Code | Description |\n"
                "|------|-------------|\n"
                "|      |             |\n"
            ),
            content_html="",
            icon="code",
            is_builtin=True,
        ),
        KBTemplate(
            name="User Story",
            description="Capture a user story with acceptance criteria.",
            content_markdown=(
                "# User Story\n\n"
                "**As a** [type of user],\n"
                "**I want** [an action or feature],\n"
                "**so that** [a benefit or value].\n\n"
                "## Description\n\n"
                "Provide additional context about the story.\n\n"
                "## Acceptance Criteria\n\n"
                "- [ ] Given ... When ... Then ...\n"
                "- [ ] Given ... When ... Then ...\n"
                "- [ ] Given ... When ... Then ...\n\n"
                "## Out of Scope\n\n"
                "- \n\n"
                "## Dependencies\n\n"
                "| Dependency | Status | Notes |\n"
                "|------------|--------|-------|\n"
                "|            |        |       |\n\n"
                "## Notes\n\n"
            ),
            content_html="",
            icon="clipboard",
            page_type="user_story",
            is_builtin=True,
        ),
    ]
    for t in templates:
        db.add(t)
    await db.flush()
