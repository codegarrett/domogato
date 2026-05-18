from __future__ import annotations

import csv
import io
import json
import re
import uuid
from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_redis
from app.models.label import Label, ticket_labels
from app.models.membership import ProjectMembership
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.ticket import Ticket
from app.models.user import User
from app.models.workflow import WorkflowStatus

logger = structlog.get_logger()

REDIS_PREFIX = "import:"
REDIS_TTL = 1800  # 30 minutes

KNOWN_COLUMN_MAPPINGS: dict[str, str] = {
    "summary": "title",
    "issue type": "ticket_type",
    "priority": "priority",
    "status": "status",
    "description": "description",
    "assignee": "assignee",
    "reporter": "reporter",
    "labels": "labels",
    "sprint": "sprint",
    "due date": "due_date",
    "issue key": "external_key",
    "parent key": "parent_key",
    "resolution": "resolution",
    "resolved": "resolved_at",
    "created": "created_date",
    "updated": "updated_date",
    "custom field (story point estimate)": "story_points",
    "custom field (start date)": "start_date",
    "story points": "story_points",
    "story point estimate": "story_points",
    "start date": "start_date",
    "parent": "parent_key",
}

TARGET_FIELDS = [
    "title", "description", "ticket_type", "priority", "status",
    "assignee", "reporter", "labels", "sprint", "story_points",
    "due_date", "start_date", "external_key", "parent_key",
    "ticket_number", "resolution", "resolved_at", "created_date", "updated_date",
]

MULTI_VALUE_FIELDS = {"labels", "sprint"}

ENUM_LIKE_FIELDS = {"ticket_type", "priority", "status", "assignee", "reporter", "labels", "sprint"}


def _parse_csv(content: str) -> tuple[list[str], list[dict[str, Any]]]:
    """Parse CSV content handling duplicate column headers by merging values."""
    reader = csv.reader(io.StringIO(content))
    raw_headers = next(reader)

    seen: dict[str, int] = {}
    header_indices: list[tuple[str, bool]] = []
    deduped_headers: list[str] = []
    for h in raw_headers:
        h_stripped = h.strip()
        if h_stripped in seen:
            seen[h_stripped] += 1
            header_indices.append((h_stripped, True))
        else:
            seen[h_stripped] = 1
            header_indices.append((h_stripped, False))
            deduped_headers.append(h_stripped)

    multi_columns = {name for name, count in seen.items() if count > 1}

    rows: list[dict[str, Any]] = []
    for raw_row in reader:
        row: dict[str, Any] = {}
        for i, value in enumerate(raw_row):
            if i >= len(header_indices):
                break
            col_name, is_dupe = header_indices[i]
            val = value.strip()
            if not val:
                continue
            if col_name in multi_columns:
                if col_name not in row:
                    row[col_name] = []
                if isinstance(row[col_name], list):
                    row[col_name].append(val)
            else:
                if col_name not in row:
                    row[col_name] = val
        if row:
            rows.append(row)

    return deduped_headers, rows


def _parse_json(content: str) -> tuple[list[str], list[dict[str, Any]]]:
    """Parse JSON content (expects array of objects)."""
    data = json.loads(content)
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("JSON must be a non-empty array of objects")

    all_keys: dict[str, None] = {}
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("Each JSON array element must be an object")
        for k in item:
            all_keys[k] = None

    columns = list(all_keys.keys())
    return columns, data


def _auto_map_columns(columns: list[str]) -> tuple[list[dict], list[str]]:
    """Auto-map columns to target fields using the known dictionary."""
    mapped: list[dict] = []
    used_targets: set[str] = set()
    unmapped: list[str] = []

    for col in columns:
        col_lower = col.lower().strip()
        target = KNOWN_COLUMN_MAPPINGS.get(col_lower)
        if target and target not in used_targets:
            mapped.append({"source_column": col, "target_field": target})
            used_targets.add(target)
        else:
            unmapped.append(col)

    return mapped, unmapped


def _extract_unique_values(
    rows: list[dict[str, Any]],
    mappings: list[dict],
    max_unique: int = 100,
) -> dict[str, list[str]]:
    """Extract unique values for enum-like target fields."""
    source_to_target: dict[str, str] = {}
    for m in mappings:
        if m["target_field"] in ENUM_LIKE_FIELDS:
            source_to_target[m["source_column"]] = m["target_field"]

    target_values: dict[str, set[str]] = {t: set() for t in source_to_target.values()}

    for row in rows:
        for src, tgt in source_to_target.items():
            val = row.get(src)
            if val is None:
                continue
            if isinstance(val, list):
                for v in val:
                    if v and len(target_values[tgt]) < max_unique:
                        target_values[tgt].add(str(v))
            elif val and len(target_values[tgt]) < max_unique:
                target_values[tgt].add(str(val))

    return {k: sorted(v) for k, v in target_values.items() if v}


def _jira_wiki_to_markdown(text: str) -> str:
    """Basic Jira wiki markup to Markdown conversion."""
    if not text:
        return text

    result = text
    result = re.sub(r'\*(\S[^*]*\S)\*', r'**\1**', result)
    result = re.sub(r'(?<!\[)_(\S[^_]*\S)_(?!\])', r'*\1*', result)
    result = re.sub(r'\{\{([^}]+)\}\}', r'`\1`', result)
    result = re.sub(r'\[([^|]+)\|([^\]]+)\]', r'[\1](\2)', result)
    result = re.sub(r'\[([^\]]+)\]', r'[\1](\1)', result)
    result = re.sub(r'!([^|!\s]+)(?:\|[^!]*)?\!', r'![\1](\1)', result)
    result = re.sub(r'^h([1-6])\.\s+', lambda m: '#' * int(m.group(1)) + ' ', result, flags=re.MULTILINE)
    result = re.sub(r'^\*\s+', '- ', result, flags=re.MULTILINE)
    result = re.sub(r'^#\s+(?![#])', '1. ', result, flags=re.MULTILINE)
    result = re.sub(r'\{noformat\}(.*?)\{noformat\}', r'```\n\1\n```', result, flags=re.DOTALL)
    result = re.sub(r'\{code[^}]*\}(.*?)\{code\}', r'```\n\1\n```', result, flags=re.DOTALL)
    result = re.sub(r'\[~accountid:[^\]]+\]', '', result)
    result = re.sub(r'\[\^[^\]]+\]', '', result)

    return result


def _parse_jira_date(value: str) -> datetime | None:
    """Parse Jira-style dates like '25/Mar/26 7:15 AM'."""
    if not value or not value.strip():
        return None
    val = value.strip()
    for fmt in ("%d/%b/%y %I:%M %p", "%d/%b/%y %H:%M", "%d/%b/%y", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(val, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_date_only(value: str) -> date | None:
    """Parse a date string into a date object."""
    dt = _parse_jira_date(value)
    if dt:
        return dt.date()
    return None


def _parse_story_points(value: Any) -> int | None:
    """Parse story points from string, handling floats like '13.0'."""
    if value is None:
        return None
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None


def _parse_ticket_number(value: Any) -> int | None:
    """Parse a ticket number from a raw value.

    Handles pure integers ("1015"), float strings ("1015.0"), and
    prefixed key formats like "ORBIS-1015" or "PROJ-42" by taking the
    numeric suffix after the last hyphen.
    """
    if value is None:
        return None
    s = str(value).strip()
    # Try float/int string directly
    try:
        n = int(float(s))
        return n if n > 0 else None
    except (ValueError, TypeError):
        pass
    # Try "PREFIX-NNN" format
    if "-" in s:
        suffix = s.rsplit("-", 1)[-1]
        try:
            n = int(suffix)
            return n if n > 0 else None
        except ValueError:
            pass
    return None


async def analyze_import(
    content: str,
    fmt: str,
) -> dict[str, Any]:
    """Parse content, detect columns, auto-map, cache in Redis, return analysis."""
    if fmt == "csv":
        columns, rows = _parse_csv(content)
    else:
        columns, rows = _parse_json(content)

    if not rows:
        raise ValueError("No data rows found in the imported content")

    mappings, unmapped = _auto_map_columns(columns)
    unique_values = _extract_unique_values(rows, mappings)
    sample_rows = rows[:5]

    session_id = str(uuid.uuid4())

    redis = await get_redis()
    cache_data = json.dumps(rows, default=str)
    await redis.set(f"{REDIS_PREFIX}{session_id}", cache_data, ex=REDIS_TTL)
    await logger.ainfo("import_analyze_cached", session_id=session_id, total_rows=len(rows))

    return {
        "import_session_id": session_id,
        "format": fmt,
        "total_rows": len(rows),
        "columns": columns,
        "suggested_mappings": mappings,
        "unmapped_columns": unmapped,
        "sample_rows": sample_rows,
        "unique_values": unique_values,
    }


async def execute_import(
    db: AsyncSession,
    project_id: UUID,
    reporter_id: UUID,
    import_session_id: str,
    column_mappings: list[dict[str, str | None]],
    value_mappings: dict[str, list[dict[str, str | None]]],
    options: dict[str, Any],
    user_mappings: dict[str, str | None] | None = None,
) -> dict[str, Any]:
    """Execute the import: retrieve cached rows, apply mappings, create tickets."""

    redis = await get_redis()
    cached = await redis.get(f"{REDIS_PREFIX}{import_session_id}")
    if cached is None:
        raise ValueError("Import session expired or not found. Please re-upload the file.")
    rows: list[dict[str, Any]] = json.loads(cached)

    col_map: dict[str, str] = {}
    for cm in column_mappings:
        if cm.get("target_field"):
            col_map[cm["source_column"]] = cm["target_field"]

    val_maps: dict[str, dict[str, str | None]] = {}
    for target_field, vms in value_mappings.items():
        val_maps[target_field] = {}
        for vm in vms:
            val_maps[target_field][vm["source_value"]] = vm.get("target_value")

    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if project is None:
        raise ValueError("Project not found")
    if project.default_workflow_id is None:
        raise ValueError("Project has no default workflow configured")

    initial_status = (
        await db.execute(
            select(WorkflowStatus).where(
                WorkflowStatus.workflow_id == project.default_workflow_id,
                WorkflowStatus.is_initial == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if initial_status is None:
        raise ValueError("Default workflow has no initial status")

    workflow_statuses = (
        await db.execute(
            select(WorkflowStatus).where(
                WorkflowStatus.workflow_id == project.default_workflow_id,
            )
        )
    ).scalars().all()
    status_name_map: dict[str, UUID] = {}
    for ws in workflow_statuses:
        status_name_map[ws.name.lower()] = ws.id

    user_display_names: set[str] = set()
    label_names: set[str] = set()
    sprint_names: set[str] = set()

    mapped_rows: list[dict[str, Any]] = []
    errors: list[dict] = []
    skipped = 0

    for row_idx, raw_row in enumerate(rows, start=1):
        mapped: dict[str, Any] = {}
        for src_col, target in col_map.items():
            val = raw_row.get(src_col)
            if val is None:
                continue
            if target in val_maps:
                if isinstance(val, list):
                    mapped_vals = []
                    for v in val:
                        mv = val_maps[target].get(str(v))
                        if mv is not None:
                            mapped_vals.append(mv)
                    mapped[target] = mapped_vals
                else:
                    mv = val_maps[target].get(str(val))
                    if mv is not None:
                        mapped[target] = mv
                    else:
                        mapped[target] = val
            else:
                mapped[target] = val

        title = mapped.get("title")
        if not title or (isinstance(title, str) and not title.strip()):
            skipped += 1
            continue

        if options.get("skip_resolved") and mapped.get("resolution"):
            skipped += 1
            continue

        if mapped.get("assignee"):
            name = str(mapped["assignee"])
            user_display_names.add(name)
        if mapped.get("reporter"):
            name = str(mapped["reporter"])
            user_display_names.add(name)

        labels_val = mapped.get("labels")
        if labels_val:
            if isinstance(labels_val, list):
                for lbl in labels_val:
                    if lbl:
                        label_names.add(str(lbl))
            elif labels_val:
                label_names.add(str(labels_val))

        sprint_val = mapped.get("sprint")
        if sprint_val:
            if isinstance(sprint_val, list):
                for s in sprint_val:
                    if s:
                        sprint_names.add(str(s))
            elif sprint_val:
                sprint_names.add(str(sprint_val))

        mapped_rows.append({"row_number": row_idx, "data": mapped})

    user_id_map = await _resolve_users(db, user_display_names, user_mappings=user_mappings)
    label_id_map, created_labels = await _find_or_create_labels(
        db, project_id, label_names, create=options.get("create_labels", True)
    )

    created_sprints: list[str] = []
    sprint_id_map: dict[str, UUID] = {}
    if sprint_names:
        sprint_id_map, created_sprints = await _resolve_sprints(
            db, project_id, sprint_names, create=options.get("create_sprints", False)
        )

    ticket_count = len(mapped_rows)
    if ticket_count == 0:
        return {
            "total_processed": len(rows),
            "tickets_created": 0,
            "tickets_skipped": skipped,
            "unresolved_assignees": 0,
            "labels_created": created_labels,
            "sprints_created": created_sprints,
            "parent_links_resolved": 0,
            "errors": errors,
        }

    # ------------------------------------------------------------------
    # Explicit ticket number resolution
    # Parse ticket_number from mapped data; validate against batch and DB
    # ------------------------------------------------------------------
    explicit_num_map: dict[int, int] = {}  # row_number → desired ticket_number
    for mr in mapped_rows:
        raw_tn = mr["data"].get("ticket_number")
        if raw_tn is not None:
            parsed = _parse_ticket_number(raw_tn)
            if parsed:
                explicit_num_map[mr["row_number"]] = parsed

    # Detect duplicates within this batch
    explicit_conflicts: dict[int, str] = {}  # row_number → reason string
    seen_in_batch: dict[int, int] = {}  # ticket_number → first row_number
    for row_num, num in explicit_num_map.items():
        if num in seen_in_batch:
            explicit_conflicts[row_num] = (
                f"Ticket number {num} appears more than once in this import "
                f"(first claimed by row {seen_in_batch[num]})"
            )
        else:
            seen_in_batch[num] = row_num

    # Detect conflicts with tickets already in the project
    candidate_nums = {
        num for rn, num in explicit_num_map.items() if rn not in explicit_conflicts
    }
    if candidate_nums:
        taken_result = await db.execute(
            select(Ticket.ticket_number).where(
                Ticket.project_id == project_id,
                Ticket.ticket_number.in_(list(candidate_nums)),
            )
        )
        taken_nums = {r.ticket_number for r in taken_result.all()}
        for row_num, num in explicit_num_map.items():
            if num in taken_nums and row_num not in explicit_conflicts:
                explicit_conflicts[row_num] = (
                    f"Ticket number {num} already exists in this project"
                )

    # Rows that will receive an auto-assigned number
    auto_mapped_rows = [
        mr for mr in mapped_rows
        if mr["row_number"] not in explicit_num_map
        or mr["row_number"] in explicit_conflicts
    ]
    auto_count = len(auto_mapped_rows)

    # Bulk-reserve sequence only for auto-numbered rows
    number_assignment: dict[int, int] = {}
    if auto_count > 0:
        result = await db.execute(
            text(
                "UPDATE projects SET ticket_sequence = ticket_sequence + :count "
                "WHERE id = :project_id RETURNING ticket_sequence"
            ),
            {"project_id": project_id, "count": auto_count},
        )
        end_number = result.scalar_one()
        start_auto = end_number - auto_count + 1
        for idx, mr in enumerate(auto_mapped_rows):
            number_assignment[mr["row_number"]] = start_auto + idx

    # Assign explicit numbers for valid explicit rows
    for row_num, num in explicit_num_map.items():
        if row_num not in explicit_conflicts:
            number_assignment[row_num] = num

    external_key_to_ticket_id: dict[str, UUID] = {}
    parent_key_rows: list[tuple[UUID, str]] = []
    created_count = 0
    unresolved_assignees_count = 0

    for mr in mapped_rows:
        data = mr["data"]
        row_num = mr["row_number"]
        ticket_number = number_assignment[row_num]

        try:
            ticket_type = str(data.get("ticket_type", "task")).lower()
            if ticket_type not in ("task", "bug", "story", "epic", "subtask"):
                ticket_type = "task"

            priority = str(data.get("priority", "medium")).lower()
            if priority not in ("lowest", "low", "medium", "high", "highest"):
                priority = "medium"

            status_val = data.get("status")
            workflow_status_id = initial_status.id
            if status_val:
                status_key = str(status_val).lower()
                if status_key in status_name_map:
                    workflow_status_id = status_name_map[status_key]
                else:
                    try:
                        workflow_status_id = UUID(str(status_val))
                    except ValueError:
                        pass

            assignee_id = None
            unmatched_assignee = None
            if data.get("assignee"):
                name = str(data["assignee"])
                assignee_id = user_id_map.get(name.lower())
                if assignee_id is None:
                    unmatched_assignee = name
                    # Only count as unresolved when the name was not an explicit "leave unassigned" choice
                    if user_mappings is None or name not in user_mappings:
                        unresolved_assignees_count += 1

            reporter_id_val = None
            unmatched_reporter = None
            if data.get("reporter"):
                name = str(data["reporter"])
                reporter_id_val = user_id_map.get(name.lower())
                if reporter_id_val is None:
                    unmatched_reporter = name
            if reporter_id_val is None:
                reporter_id_val = reporter_id

            description = data.get("description")
            if isinstance(description, str):
                description = _jira_wiki_to_markdown(description)

            story_points = _parse_story_points(data.get("story_points"))
            due_date = _parse_date_only(str(data["due_date"])) if data.get("due_date") else None
            start_date_val = _parse_date_only(str(data["start_date"])) if data.get("start_date") else None
            resolution = data.get("resolution") if data.get("resolution") else None

            resolved_at = None
            if data.get("resolved_at"):
                resolved_at = _parse_jira_date(str(data["resolved_at"]))

            sprint_id = None
            sprint_val = data.get("sprint")
            if sprint_val:
                sname = str(sprint_val) if not isinstance(sprint_val, list) else next(
                    (s for s in sprint_val if s), None
                )
                if sname and sname.lower() in sprint_id_map:
                    sprint_id = sprint_id_map[sname.lower()]

            import_meta: dict[str, Any] = {"source": "csv_import", "imported_at": datetime.now(timezone.utc).isoformat()}
            if row_num in explicit_conflicts:
                import_meta["explicit_number_conflict"] = explicit_conflicts[row_num]
                import_meta["requested_ticket_number"] = explicit_num_map.get(row_num)
            if data.get("external_key"):
                import_meta["external_key"] = str(data["external_key"])
            if data.get("created_date"):
                created_dt = _parse_jira_date(str(data["created_date"]))
                if created_dt:
                    import_meta["original_created_at"] = created_dt.isoformat()
            if data.get("updated_date"):
                updated_dt = _parse_jira_date(str(data["updated_date"]))
                if updated_dt:
                    import_meta["original_updated_at"] = updated_dt.isoformat()
            if unmatched_assignee:
                import_meta["unmatched_assignee"] = unmatched_assignee
            if unmatched_reporter:
                import_meta["unmatched_reporter"] = unmatched_reporter

            custom_field_values = {"import_metadata": import_meta}

            ticket = Ticket(
                project_id=project_id,
                ticket_number=ticket_number,
                title=str(data["title"]).strip()[:500],
                description=description,
                ticket_type=ticket_type,
                priority=priority,
                workflow_status_id=workflow_status_id,
                assignee_id=assignee_id,
                reporter_id=reporter_id_val,
                story_points=story_points,
                due_date=due_date,
                start_date=start_date_val,
                resolution=resolution,
                resolved_at=resolved_at,
                sprint_id=sprint_id,
                custom_field_values=custom_field_values,
            )
            db.add(ticket)
            await db.flush()

            ext_key = data.get("external_key")
            if ext_key:
                external_key_to_ticket_id[str(ext_key)] = ticket.id

            parent_key = data.get("parent_key")
            if parent_key:
                pk = str(parent_key) if not isinstance(parent_key, list) else str(parent_key[0]) if parent_key else None
                if pk:
                    parent_key_rows.append((ticket.id, pk))

            labels_val = data.get("labels")
            if labels_val:
                lbl_names = labels_val if isinstance(labels_val, list) else [labels_val]
                for lbl_name in lbl_names:
                    lbl_id = label_id_map.get(str(lbl_name).lower())
                    if lbl_id:
                        await db.execute(
                            ticket_labels.insert().values(ticket_id=ticket.id, label_id=lbl_id)
                        )

            created_count += 1

        except Exception as exc:
            await logger.awarning(
                "import_row_error", row=row_num, error=str(exc),
                external_key=data.get("external_key"),
            )
            errors.append({
                "row_number": row_num,
                "external_key": data.get("external_key"),
                "error": str(exc),
            })

    parent_links = 0
    for ticket_id, parent_key in parent_key_rows:
        parent_ticket_id = external_key_to_ticket_id.get(parent_key)
        if parent_ticket_id:
            await db.execute(
                update(Ticket)
                .where(Ticket.id == ticket_id)
                .values(parent_ticket_id=parent_ticket_id)
            )
            parent_links += 1

    await db.flush()

    # Ensure ticket_sequence is at least as high as the largest explicit number used,
    # so future create_ticket calls don't collide with preserved numbers.
    valid_explicit_nums = [
        explicit_num_map[rn]
        for rn in explicit_num_map
        if rn not in explicit_conflicts
    ]
    if valid_explicit_nums:
        await db.execute(
            text(
                "UPDATE projects SET ticket_sequence = GREATEST(ticket_sequence, :max_num) "
                "WHERE id = :project_id"
            ),
            {"project_id": project_id, "max_num": max(valid_explicit_nums)},
        )

    await redis.delete(f"{REDIS_PREFIX}{import_session_id}")

    await logger.ainfo(
        "import_execute_complete",
        project_id=str(project_id),
        created=created_count,
        skipped=skipped,
        errors=len(errors),
        parent_links=parent_links,
    )

    return {
        "total_processed": len(rows),
        "tickets_created": created_count,
        "tickets_skipped": skipped,
        "unresolved_assignees": unresolved_assignees_count,
        "labels_created": created_labels,
        "sprints_created": created_sprints,
        "parent_links_resolved": parent_links,
        "errors": errors,
    }


async def _resolve_users(
    db: AsyncSession,
    display_names: set[str],
    user_mappings: dict[str, str | None] | None = None,
) -> dict[str, UUID]:
    """Match display names to user IDs (case-insensitive).

    user_mappings overrides take priority: a UUID string sets the mapping
    directly; an explicit None marks the name as intentionally unassigned
    and skips the DB lookup for it.
    """
    result: dict[str, UUID] = {}

    # Apply overrides from user_mappings first, collect which names are covered
    overridden: set[str] = set()
    if user_mappings:
        for source_name, user_id_str in user_mappings.items():
            key = source_name.lower()
            if user_id_str is not None:
                try:
                    result[key] = UUID(user_id_str)
                except ValueError:
                    pass
            # Explicit None → intentionally unassigned; mark as covered so DB lookup is skipped
            overridden.add(key)

    # DB lookup for names not covered by overrides
    remaining = {n for n in display_names if n.lower() not in overridden}
    if remaining:
        db_result = await db.execute(
            select(User.id, User.display_name).where(
                func.lower(User.display_name).in_([n.lower() for n in remaining])
            )
        )
        for row in db_result.all():
            result[row.display_name.lower()] = row.id

    return result


async def preview_users(
    db: AsyncSession,
    project_id: UUID,
    names: list[str],
) -> dict[str, Any]:
    """Resolve a list of raw import names against project members.

    Returns match quality per name and the full project member roster
    for use in the manual-override dropdown.
    """
    members_result = await db.execute(
        select(User.id, User.display_name, User.email, User.avatar_url)
        .join(ProjectMembership, ProjectMembership.user_id == User.id)
        .where(ProjectMembership.project_id == project_id)
        .order_by(User.display_name)
    )
    members = members_result.all()

    by_display_name: dict[str, Any] = {m.display_name.lower(): m for m in members}
    by_email: dict[str, Any] = {m.email.lower(): m for m in members}

    matches = []
    for name in names:
        name_lower = name.lower()
        match_type = "none"
        matched_user_id = None
        matched_display_name = None

        if name_lower in by_display_name:
            m = by_display_name[name_lower]
            match_type = "exact"
            matched_user_id = str(m.id)
            matched_display_name = m.display_name
        elif name_lower in by_email:
            m = by_email[name_lower]
            match_type = "email"
            matched_user_id = str(m.id)
            matched_display_name = m.display_name

        matches.append({
            "source_name": name,
            "matched_user_id": matched_user_id,
            "matched_display_name": matched_display_name,
            "match_type": match_type,
        })

    project_members = [
        {
            "user_id": str(m.id),
            "display_name": m.display_name,
            "email": m.email,
            "avatar_url": m.avatar_url,
        }
        for m in members
    ]

    return {"matches": matches, "project_members": project_members}


async def _find_or_create_labels(
    db: AsyncSession,
    project_id: UUID,
    label_names: set[str],
    create: bool = True,
) -> tuple[dict[str, UUID], list[str]]:
    """Find existing labels, optionally create missing ones. Returns (name_lower -> id, created_names)."""
    if not label_names:
        return {}, []

    existing = (
        await db.execute(
            select(Label).where(
                Label.project_id == project_id,
                func.lower(Label.name).in_([n.lower() for n in label_names]),
            )
        )
    ).scalars().all()

    label_map: dict[str, UUID] = {lbl.name.lower(): lbl.id for lbl in existing}
    created: list[str] = []

    if create:
        for name in label_names:
            if name.lower() not in label_map:
                label = Label(project_id=project_id, name=name, color="#6B7280")
                db.add(label)
                await db.flush()
                await db.refresh(label)
                label_map[name.lower()] = label.id
                created.append(name)

    return label_map, created


async def _resolve_sprints(
    db: AsyncSession,
    project_id: UUID,
    sprint_names: set[str],
    create: bool = False,
) -> tuple[dict[str, UUID], list[str]]:
    """Match sprint names, optionally create missing. Returns (name_lower -> id, created_names)."""
    if not sprint_names:
        return {}, []

    existing = (
        await db.execute(
            select(Sprint).where(
                Sprint.project_id == project_id,
                func.lower(Sprint.name).in_([n.lower() for n in sprint_names]),
            )
        )
    ).scalars().all()

    sprint_map: dict[str, UUID] = {s.name.lower(): s.id for s in existing}
    created: list[str] = []

    if create:
        for name in sprint_names:
            if name.lower() not in sprint_map:
                sprint = Sprint(project_id=project_id, name=name, status="planning")
                db.add(sprint)
                await db.flush()
                await db.refresh(sprint)
                sprint_map[name.lower()] = sprint.id
                created.append(name)

    return sprint_map, created
