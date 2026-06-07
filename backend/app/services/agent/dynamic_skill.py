"""Runtime skill wrapper for markdown-defined custom skills."""
from __future__ import annotations

import json
import re
from uuid import UUID

import structlog

from app.core.permissions import ProjectRole
from app.models.agent_skill_definition import AgentSkillDefinition
from app.services.agent.http_request_service import http_request
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillError,
    SkillPermissionError,
    check_project_access,
)
from app.services.agent_skill_parser import ParsedAgentSkill, extract_json_path, parse_agent_skill_md
from app.services.agent_skill_secrets import get_global_secrets, get_project_secrets

logger = structlog.get_logger()

_TEMPLATE_RE = re.compile(r"\{\{(secret:)?([^}]+)\}\}")

_ROLE_MAP = {
    "guest": ProjectRole.GUEST,
    "developer": ProjectRole.DEVELOPER,
    "maintainer": ProjectRole.MAINTAINER,
}


def _substitute(value: str, params: dict, secrets: dict[str, str]) -> str:
    def repl(match: re.Match) -> str:
        if match.group(1):
            key = match.group(2).strip()
            if key not in secrets:
                raise SkillError(f"Secret '{key}' is not configured")
            return secrets[key]
        key = match.group(2).strip()
        if key not in params:
            raise SkillError(f"Parameter '{key}' is required for substitution")
        return str(params[key])

    return _TEMPLATE_RE.sub(repl, value)


def _substitute_mapping(mapping: dict, params: dict, secrets: dict[str, str]) -> dict[str, str]:
    return {k: _substitute(str(v), params, secrets) for k, v in mapping.items()}


class DynamicSkill(BaseSkill):
    """Wraps a stored AgentSkillDefinition as an executable skill."""

    def __init__(
        self,
        definition: AgentSkillDefinition,
        parsed: ParsedAgentSkill | None = None,
    ) -> None:
        self._definition = definition
        self._parsed = parsed or parse_agent_skill_md(definition.content_md)
        self.name = self._parsed.tool_name
        self.description = self._parsed.description
        self.category = self._parsed.category
        self.parameters_schema = self._parsed.parameters_schema

    @property
    def definition_id(self) -> UUID:
        return self._definition.id

    @property
    def project_id(self) -> UUID | None:
        return self._definition.project_id

    async def execute(self, ctx: SkillContext) -> dict:
        parsed = self._parsed
        project_key = ctx.params.get("project_key")
        if not project_key:
            return {"error": "project_key is required"}

        min_role = _ROLE_MAP.get(parsed.min_role, ProjectRole.GUEST)
        try:
            project = await check_project_access(
                ctx.db, ctx.user, str(project_key), min_role=min_role
            )
        except SkillPermissionError as exc:
            return {"error": str(exc)}

        if self._definition.project_id is not None and project.id != self._definition.project_id:
            return {"error": "This skill is not available for the selected project"}

        if parsed.request is None:
            return {"error": "Skill has no request configuration"}

        secrets = await get_project_secrets(ctx.db, project.id)
        if self._definition.project_id is None:
            secrets = {**await get_global_secrets(ctx.db), **secrets}

        params = dict(ctx.params)
        req = parsed.request
        try:
            url = _substitute(str(req["url"]), params, secrets)
            headers = _substitute_mapping(req.get("headers") or {}, params, secrets)
            body_raw = req.get("body")
            body = None
            if body_raw is not None:
                if isinstance(body_raw, dict):
                    body = json.loads(_substitute(json.dumps(body_raw), params, secrets))
                else:
                    body = _substitute(str(body_raw), params, secrets)
        except SkillError as exc:
            return {"error": str(exc)}

        timeout = float(req.get("timeout_seconds", 15))
        max_bytes = int(req.get("max_response_bytes", 65536))
        method = str(req.get("method", "GET"))

        await logger.ainfo(
            "custom_skill_http_request",
            tool_name=self.name,
            project_id=str(project.id),
            user_id=str(ctx.user.id),
            host=url.split("/")[2] if "://" in url else url,
        )

        result = await http_request(
            method=method,
            url=url,
            headers=headers,
            body=body,
            timeout_seconds=timeout,
            max_response_bytes=max_bytes,
            allowed_hosts=parsed.allowed_hosts,
        )

        if "error" in result:
            return result

        data = result.get("body")
        if parsed.response and parsed.response.get("json_path"):
            data = extract_json_path(data, str(parsed.response["json_path"]))

        return {
            "status_code": result.get("status_code"),
            "data": data,
            "truncated": result.get("truncated", False),
        }
