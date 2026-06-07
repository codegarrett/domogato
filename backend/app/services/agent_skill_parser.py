"""Parse and validate markdown agent skill definitions."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

import yaml
from fastapi import HTTPException, status

from app.core.config import settings
from app.services.agent.builtin_names import BUILTIN_SKILL_NAMES

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)\Z", re.DOTALL)
TOOL_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,63}$")
SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]{1,98}[a-z0-9]$")
VALID_MIN_ROLES = frozenset({"guest", "developer", "maintainer"})
VALID_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"})


@dataclass
class ParsedAgentSkill:
    tool_name: str
    description: str
    category: str
    min_role: str
    parameters_schema: dict
    request: dict | None = None
    response: dict | None = None
    allowed_hosts: list[str] = field(default_factory=list)
    body_markdown: str = ""


def _full_description(base: str, body: str) -> str:
    body = body.strip()
    if not body:
        return base.strip()
    return f"{base.strip()}\n\n{body}"


def parse_agent_skill_md(content_md: str) -> ParsedAgentSkill:
    match = FRONTMATTER_RE.match(content_md.strip())
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill must start with YAML frontmatter delimited by ---",
        )

    try:
        meta = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid YAML frontmatter: {exc}",
        ) from exc

    if not isinstance(meta, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Frontmatter must be a YAML mapping")

    body = match.group(2) or ""

    tool_name = str(meta.get("tool_name", "")).strip()
    if not TOOL_NAME_RE.match(tool_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tool_name must be 4-64 chars: lowercase letters, digits, underscores",
        )
    if tool_name in BUILTIN_SKILL_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"tool_name '{tool_name}' is reserved for a built-in skill",
        )

    description = str(meta.get("description", "")).strip()
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="description is required")

    category = str(meta.get("category", "integrations")).strip() or "integrations"
    min_role = str(meta.get("min_role", "guest")).strip().lower()
    if min_role not in VALID_MIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"min_role must be one of: {', '.join(sorted(VALID_MIN_ROLES))}",
        )

    parameters = meta.get("parameters")
    if not isinstance(parameters, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="parameters must be a JSON Schema object")
    if parameters.get("type") != "object":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="parameters.type must be 'object'")
    required = parameters.get("required") or []
    if "project_key" not in required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="parameters.required must include 'project_key'",
        )

    request = meta.get("request")
    if request is not None:
        if not isinstance(request, dict):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request must be a mapping")
        _validate_request(request)

    response = meta.get("response")
    if response is not None and not isinstance(response, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="response must be a mapping")

    allowed_hosts_raw = meta.get("allowed_hosts") or []
    if not isinstance(allowed_hosts_raw, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="allowed_hosts must be a list")
    allowed_hosts = [str(h).strip().lower() for h in allowed_hosts_raw if str(h).strip()]

    return ParsedAgentSkill(
        tool_name=tool_name,
        description=_full_description(description, body),
        category=category,
        min_role=min_role,
        parameters_schema=parameters,
        request=request,
        response=response,
        allowed_hosts=allowed_hosts,
        body_markdown=body.strip(),
    )


def _validate_request(request: dict) -> None:
    method = str(request.get("method", "GET")).upper()
    if method not in VALID_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"request.method must be one of: {', '.join(sorted(VALID_METHODS))}",
        )
    url = str(request.get("url", "")).strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request.url is required")
    if settings.DEBUG:
        if not (url.startswith("https://") or url.startswith("http://")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request.url must be http(s)://")
    elif not url.startswith("https://"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request.url must use https://")

    headers = request.get("headers")
    if headers is not None and not isinstance(headers, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request.headers must be a mapping")

    body = request.get("body")
    if body is not None and not isinstance(body, (str, dict)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="request.body must be a string or mapping")


def validate_slug(slug: str) -> str:
    slug = slug.strip().lower()
    if not SLUG_RE.match(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug must be 3-100 chars: lowercase letters, digits, hyphens, underscores",
        )
    return slug


def extract_json_path(data: Any, json_path: str | None) -> Any:
    if not json_path or json_path in ("$", ""):
        return data
    path = json_path.strip()
    if path.startswith("$."):
        path = path[2:]
    elif path.startswith("$"):
        path = path[1:].lstrip(".")
    current = data
    for part in path.split("."):
        if not part:
            continue
        if isinstance(current, dict):
            if part not in current:
                return None
            current = current[part]
        elif isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
    return current


def try_parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text
