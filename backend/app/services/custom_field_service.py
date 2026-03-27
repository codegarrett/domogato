from __future__ import annotations

import re
from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.custom_field import CustomFieldDefinition, CustomFieldOption
from app.models.ticket import Ticket


async def create_field_definition(
    db: AsyncSession,
    *,
    project_id: UUID,
    name: str,
    field_type: str,
    description: str | None = None,
    is_required: bool = False,
    validation_rules: dict[str, Any] | None = None,
    options: list[dict[str, Any]] | None = None,
) -> CustomFieldDefinition:
    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(CustomFieldDefinition.position), -1)).where(
                CustomFieldDefinition.project_id == project_id,
                CustomFieldDefinition.is_active == True,  # noqa: E712
            )
        )
    ).scalar_one()

    defn = CustomFieldDefinition(
        project_id=project_id,
        name=name,
        field_type=field_type,
        description=description,
        is_required=is_required,
        position=max_pos + 1,
        validation_rules=validation_rules or {},
    )
    db.add(defn)
    await db.flush()

    if options and field_type in ("select", "multi_select"):
        for i, opt in enumerate(options):
            o = CustomFieldOption(
                field_definition_id=defn.id,
                label=opt["label"],
                color=opt.get("color"),
                position=i,
            )
            db.add(o)
        await db.flush()

    await db.refresh(defn, attribute_names=["options"])
    return defn


async def get_field_definition(
    db: AsyncSession, field_id: UUID
) -> CustomFieldDefinition | None:
    result = await db.execute(
        select(CustomFieldDefinition)
        .options(selectinload(CustomFieldDefinition.options))
        .where(CustomFieldDefinition.id == field_id)
    )
    return result.scalar_one_or_none()


async def list_field_definitions(
    db: AsyncSession,
    project_id: UUID,
    *,
    include_inactive: bool = False,
) -> list[CustomFieldDefinition]:
    query = (
        select(CustomFieldDefinition)
        .options(selectinload(CustomFieldDefinition.options))
        .where(CustomFieldDefinition.project_id == project_id)
    )
    if not include_inactive:
        query = query.where(CustomFieldDefinition.is_active == True)  # noqa: E712
    query = query.order_by(CustomFieldDefinition.position)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_field_definition(
    db: AsyncSession, field_id: UUID, **kwargs: Any
) -> CustomFieldDefinition | None:
    defn = await get_field_definition(db, field_id)
    if defn is None:
        return None
    for key, value in kwargs.items():
        if value is not None and hasattr(defn, key):
            setattr(defn, key, value)
    await db.flush()
    await db.refresh(defn)
    result = await db.execute(
        select(CustomFieldDefinition)
        .options(selectinload(CustomFieldDefinition.options))
        .where(CustomFieldDefinition.id == field_id)
    )
    return result.scalar_one()


async def delete_field_definition(
    db: AsyncSession, field_id: UUID
) -> bool:
    defn = await get_field_definition(db, field_id)
    if defn is None:
        return False
    defn.is_active = False
    await db.flush()
    return True


async def reorder_fields(
    db: AsyncSession, project_id: UUID, field_ids: list[UUID]
) -> list[CustomFieldDefinition]:
    definitions = await list_field_definitions(db, project_id)
    id_map = {d.id: d for d in definitions}
    for i, fid in enumerate(field_ids):
        if fid in id_map:
            id_map[fid].position = i
    await db.flush()
    return await list_field_definitions(db, project_id)


async def add_option(
    db: AsyncSession,
    field_id: UUID,
    *,
    label: str,
    color: str | None = None,
) -> CustomFieldOption:
    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(CustomFieldOption.position), -1)).where(
                CustomFieldOption.field_definition_id == field_id,
            )
        )
    ).scalar_one()

    opt = CustomFieldOption(
        field_definition_id=field_id,
        label=label,
        color=color,
        position=max_pos + 1,
    )
    db.add(opt)
    await db.flush()
    await db.refresh(opt)
    return opt


async def get_option(db: AsyncSession, option_id: UUID) -> CustomFieldOption | None:
    result = await db.execute(
        select(CustomFieldOption).where(CustomFieldOption.id == option_id)
    )
    return result.scalar_one_or_none()


async def remove_option(db: AsyncSession, option_id: UUID) -> bool:
    opt = await get_option(db, option_id)
    if opt is None:
        return False
    await db.delete(opt)
    await db.flush()
    return True


def _validate_single_value(
    value: Any,
    defn: CustomFieldDefinition,
    option_ids: set[str],
) -> str | None:
    """Validate a single field value. Returns error message or None."""
    ft = defn.field_type
    rules = defn.validation_rules or {}

    if value is None or value == "" or value == []:
        if defn.is_required:
            return f"Field '{defn.name}' is required"
        return None

    if ft == "text":
        if not isinstance(value, str):
            return f"Field '{defn.name}' must be a string"
        if "min_length" in rules and len(value) < rules["min_length"]:
            return f"Field '{defn.name}' must be at least {rules['min_length']} characters"
        if "max_length" in rules and len(value) > rules["max_length"]:
            return f"Field '{defn.name}' must be at most {rules['max_length']} characters"
        if "pattern" in rules:
            if not re.match(rules["pattern"], value):
                return f"Field '{defn.name}' does not match the required pattern"

    elif ft == "number":
        if not isinstance(value, (int, float)):
            return f"Field '{defn.name}' must be a number"
        if "min" in rules and value < rules["min"]:
            return f"Field '{defn.name}' must be >= {rules['min']}"
        if "max" in rules and value > rules["max"]:
            return f"Field '{defn.name}' must be <= {rules['max']}"

    elif ft == "date":
        if not isinstance(value, str):
            return f"Field '{defn.name}' must be a date string (YYYY-MM-DD)"
        try:
            date.fromisoformat(value)
        except ValueError:
            return f"Field '{defn.name}' must be a valid date (YYYY-MM-DD)"

    elif ft == "select":
        if not isinstance(value, str):
            return f"Field '{defn.name}' must be a string (option ID)"
        if value not in option_ids:
            return f"Field '{defn.name}': invalid option '{value}'"

    elif ft == "multi_select":
        if not isinstance(value, list):
            return f"Field '{defn.name}' must be a list of option IDs"
        for v in value:
            if not isinstance(v, str):
                return f"Field '{defn.name}': each item must be a string (option ID)"
            if v not in option_ids:
                return f"Field '{defn.name}': invalid option '{v}'"

    elif ft == "user":
        if not isinstance(value, str):
            return f"Field '{defn.name}' must be a string (user ID)"

    elif ft == "url":
        if not isinstance(value, str):
            return f"Field '{defn.name}' must be a string (URL)"
        if not value.startswith(("http://", "https://")):
            return f"Field '{defn.name}' must start with http:// or https://"

    elif ft == "checkbox":
        if not isinstance(value, bool):
            return f"Field '{defn.name}' must be a boolean"

    return None


async def validate_field_values(
    db: AsyncSession,
    project_id: UUID,
    values: dict[str, Any],
) -> list[str]:
    """Validate custom field values. Returns list of error messages (empty = valid)."""
    definitions = await list_field_definitions(db, project_id)
    defn_map = {str(d.id): d for d in definitions}
    errors: list[str] = []

    for defn in definitions:
        fid = str(defn.id)
        val = values.get(fid)
        if (val is None or val == "" or val == []) and defn.is_required:
            if fid not in values:
                errors.append(f"Field '{defn.name}' is required")

    for fid, val in values.items():
        defn = defn_map.get(fid)
        if defn is None:
            continue
        option_ids = {str(o.id) for o in defn.options}
        err = _validate_single_value(val, defn, option_ids)
        if err:
            errors.append(err)

    return errors


async def get_ticket_custom_fields(
    db: AsyncSession, ticket_id: UUID
) -> dict[str, Any]:
    result = await db.execute(
        select(Ticket.custom_field_values).where(Ticket.id == ticket_id)
    )
    row = result.scalar_one_or_none()
    return row if row is not None else {}


async def set_ticket_custom_fields(
    db: AsyncSession,
    ticket_id: UUID,
    values: dict[str, Any],
) -> dict[str, Any]:
    ticket = (
        await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ).scalar_one_or_none()
    if ticket is None:
        raise ValueError("Ticket not found")

    current = dict(ticket.custom_field_values or {})
    current.update(values)
    # Remove keys set to None
    current = {k: v for k, v in current.items() if v is not None}
    ticket.custom_field_values = current
    await db.flush()
    await db.refresh(ticket)
    return ticket.custom_field_values
