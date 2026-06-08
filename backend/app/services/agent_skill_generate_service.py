"""LLM-assisted generation of agent skill markdown definitions."""
from __future__ import annotations

import re

from fastapi import HTTPException, status

from app.services.agent.builtin_names import BUILTIN_SKILL_NAMES
from app.services.agent_skill_parser import ParsedAgentSkill, parse_agent_skill_md
from app.services.llm import LLMConfigError, LLMError, get_llm_provider, is_llm_configured

_FENCE_RE = re.compile(r"^```(?:markdown|md|yaml)?\s*\n?(.*?)\n?```\s*$", re.DOTALL | re.IGNORECASE)

_SYSTEM_PROMPT = """You write custom agent skill definition files for ProjectHub.

Output ONLY a single markdown file: YAML frontmatter between --- lines, then an optional markdown body.
Do not wrap the output in code fences. Do not add commentary before or after the file.

Required frontmatter fields:
- tool_name: lowercase snake_case, 4-64 chars, must NOT match built-in tools
- description: one-line summary for the LLM
- parameters: JSON Schema object with type object, must require project_key
- request: HTTP step with method, https url (use {{param}} and {{secret:NAME}} placeholders)

Optional: category (default integrations), min_role (guest|developer|maintainer),
allowed_hosts, response.json_path, timeout_seconds, max_response_bytes.

Reserved built-in tool names (never reuse): {builtin_names}

Use {{secret:KEY_NAME}} for API tokens — never put real secrets in the file.
Always include project_key in parameters.required.
"""


def _extract_markdown(raw: str) -> str:
    text = raw.strip()
    match = _FENCE_RE.match(text)
    if match:
        return match.group(1).strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def _suggested_display_name(parsed: ParsedAgentSkill) -> str:
    name = parsed.tool_name.replace("_", " ").strip()
    return name[:1].upper() + name[1:] if name else parsed.tool_name


def _validate_generated(content_md: str) -> tuple[ParsedAgentSkill | None, list[str]]:
    try:
        parsed = parse_agent_skill_md(content_md)
        return parsed, []
    except HTTPException as exc:
        detail = exc.detail
        if isinstance(detail, list):
            return None, [str(d) for d in detail]
        return None, [str(detail)]


async def generate_agent_skill_md(
    *,
    prompt: str,
    current_content_md: str | None = None,
    display_name: str | None = None,
) -> dict:
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM is not configured. Set LLM_PROVIDER and LLM_MODEL to use AI generation.",
        )

    user_parts = [f"User request:\n{prompt.strip()}"]
    if display_name and display_name.strip():
        user_parts.append(f"Display name hint: {display_name.strip()}")
    if current_content_md and current_content_md.strip():
        user_parts.append(
            "Update the existing skill definition below. Keep tool_name stable unless "
            "the user explicitly asks to rename it.\n\n"
            f"Current file:\n{current_content_md.strip()}"
        )
    else:
        user_parts.append("Create a new skill definition from scratch.")

    system = _SYSTEM_PROMPT.format(
        builtin_names=", ".join(sorted(BUILTIN_SKILL_NAMES)),
    )

    try:
        provider = get_llm_provider()
        response = await provider.chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": "\n\n".join(user_parts)},
            ],
            max_tokens=4096,
            temperature=0.2,
        )
    except LLMConfigError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM generation failed: {exc}",
        ) from exc

    content_md = _extract_markdown(response.content or "")
    if not content_md:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM returned empty content",
        )

    parsed, errors = _validate_generated(content_md)
    if parsed is None:
        return {
            "content_md": content_md,
            "suggested_name": None,
            "valid": False,
            "errors": errors,
            "tool_name": None,
        }

    return {
        "content_md": content_md,
        "suggested_name": _suggested_display_name(parsed),
        "valid": True,
        "errors": [],
        "tool_name": parsed.tool_name,
    }
