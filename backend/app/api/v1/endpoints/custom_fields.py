from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.custom_field import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionRead,
    CustomFieldDefinitionUpdate,
    CustomFieldOptionCreate,
    CustomFieldOptionRead,
    CustomFieldValuesRead,
    CustomFieldValuesSet,
)
from app.services import custom_field_service, project_service, ticket_service

router = APIRouter(tags=["custom-fields"])


async def _require_project_role(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


# ---------- Field definition endpoints ----------


@router.get(
    "/projects/{project_id}/custom-fields",
    response_model=list[CustomFieldDefinitionRead],
)
async def list_definitions(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    definitions = await custom_field_service.list_field_definitions(db, project_id)
    return [CustomFieldDefinitionRead.model_validate(d) for d in definitions]


@router.post(
    "/projects/{project_id}/custom-fields",
    response_model=CustomFieldDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_definition(
    project_id: UUID,
    body: CustomFieldDefinitionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.MAINTAINER)
    defn = await custom_field_service.create_field_definition(
        db,
        project_id=project_id,
        name=body.name,
        field_type=body.field_type,
        description=body.description,
        is_required=body.is_required,
        validation_rules=body.validation_rules,
        options=[o.model_dump() for o in body.options],
    )
    return CustomFieldDefinitionRead.model_validate(defn)


@router.patch(
    "/custom-fields/{field_id}",
    response_model=CustomFieldDefinitionRead,
)
async def update_definition(
    field_id: UUID,
    body: CustomFieldDefinitionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    defn = await custom_field_service.get_field_definition(db, field_id)
    if defn is None:
        raise HTTPException(status_code=404, detail="Field definition not found")
    await _require_project_role(db, defn.project_id, user, ProjectRole.MAINTAINER)
    update_data = body.model_dump(exclude_unset=True)
    updated = await custom_field_service.update_field_definition(db, field_id, **update_data)
    return CustomFieldDefinitionRead.model_validate(updated)


@router.delete(
    "/custom-fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_definition(
    field_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    defn = await custom_field_service.get_field_definition(db, field_id)
    if defn is None:
        raise HTTPException(status_code=404, detail="Field definition not found")
    await _require_project_role(db, defn.project_id, user, ProjectRole.MAINTAINER)
    await custom_field_service.delete_field_definition(db, field_id)


@router.put(
    "/projects/{project_id}/custom-fields/reorder",
    response_model=list[CustomFieldDefinitionRead],
)
async def reorder_definitions(
    project_id: UUID,
    field_ids: list[UUID],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.MAINTAINER)
    definitions = await custom_field_service.reorder_fields(db, project_id, field_ids)
    return [CustomFieldDefinitionRead.model_validate(d) for d in definitions]


# ---------- Option endpoints ----------


@router.post(
    "/custom-fields/{field_id}/options",
    response_model=CustomFieldOptionRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_option(
    field_id: UUID,
    body: CustomFieldOptionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    defn = await custom_field_service.get_field_definition(db, field_id)
    if defn is None:
        raise HTTPException(status_code=404, detail="Field definition not found")
    if defn.field_type not in ("select", "multi_select"):
        raise HTTPException(status_code=400, detail="Options only apply to select/multi_select fields")
    await _require_project_role(db, defn.project_id, user, ProjectRole.MAINTAINER)
    opt = await custom_field_service.add_option(
        db, field_id, label=body.label, color=body.color,
    )
    return CustomFieldOptionRead.model_validate(opt)


@router.delete(
    "/custom-fields/options/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_option(
    option_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    opt = await custom_field_service.get_option(db, option_id)
    if opt is None:
        raise HTTPException(status_code=404, detail="Option not found")
    defn = await custom_field_service.get_field_definition(db, opt.field_definition_id)
    if defn:
        await _require_project_role(db, defn.project_id, user, ProjectRole.MAINTAINER)
    await custom_field_service.remove_option(db, option_id)


# ---------- Ticket custom field value endpoints ----------


@router.get(
    "/tickets/{ticket_id}/custom-fields",
    response_model=CustomFieldValuesRead,
)
async def get_ticket_values(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.GUEST)
    values = await custom_field_service.get_ticket_custom_fields(db, ticket_id)
    return CustomFieldValuesRead(values=values)


@router.put(
    "/tickets/{ticket_id}/custom-fields",
    response_model=CustomFieldValuesRead,
)
async def set_ticket_values(
    ticket_id: UUID,
    body: CustomFieldValuesSet,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.DEVELOPER)

    errors = await custom_field_service.validate_field_values(
        db, ticket.project_id, body.values,
    )
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors,
        )

    values = await custom_field_service.set_ticket_custom_fields(
        db, ticket_id, body.values,
    )
    return CustomFieldValuesRead(values=values)
