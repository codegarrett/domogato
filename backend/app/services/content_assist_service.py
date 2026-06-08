"""LLM-assisted generation and translation for tickets and issue reports."""
from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException, status

from app.schemas.content_assist import ContentAssistContext
from app.services.llm import LLMConfigError, LLMError, get_llm_provider, is_llm_configured

_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", re.DOTALL | re.IGNORECASE)

_TICKET_TYPES = frozenset({"task", "bug", "story", "epic", "subtask"})
_TICKET_PRIORITIES = frozenset({"lowest", "low", "medium", "high", "highest"})
_ISSUE_PRIORITIES = frozenset({"low", "medium", "high", "critical"})
_TICKET_FROM_REPORTS_TYPES = frozenset({"task", "bug", "story", "epic"})

_LOCALE_NAMES = {"en": "English", "es": "Spanish"}


def _extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    match = _JSON_FENCE_RE.match(text)
    if match:
        text = match.group(1).strip()
    elif text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned invalid JSON: {exc}",
        ) from exc
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM response must be a JSON object",
        )
    return parsed


def _sanitize_ticket_type(value: Any, *, allow_subtask: bool = True) -> str | None:
    if not isinstance(value, str):
        return None
    v = value.strip().lower()
    allowed = _TICKET_TYPES if allow_subtask else _TICKET_FROM_REPORTS_TYPES
    return v if v in allowed else None


def _sanitize_ticket_priority(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    v = value.strip().lower()
    return v if v in _TICKET_PRIORITIES else None


def _sanitize_issue_priority(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    v = value.strip().lower()
    return v if v in _ISSUE_PRIORITIES else None


def _sanitize_story_points(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if 0 <= value <= 999 else None
    if isinstance(value, float) and value.is_integer():
        iv = int(value)
        return iv if 0 <= iv <= 999 else None
    return None


def _sanitize_str(value: Any, *, max_len: int = 50000) -> str | None:
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not s:
        return None
    return s[:max_len]


def _system_prompt_for_context(context: ContentAssistContext) -> str:
    if context in (ContentAssistContext.TICKET_CREATE, ContentAssistContext.TICKET_EDIT):
        return """You help draft or update project management tickets for ProjectHub.

Output ONLY a single JSON object with no markdown fences and no commentary.
Fields (include only those relevant to the request):
- title: string (concise, actionable)
- description: string (markdown: headings, lists, code blocks as appropriate)
- ticket_type: one of task, bug, story, epic, subtask
- priority: one of lowest, low, medium, high, highest
- story_points: integer 0-999 or null

For edits, apply only the changes the user requested; keep unchanged fields as-is unless the user asks to revise them.
"""
    if context == ContentAssistContext.TICKET_FROM_REPORTS:
        return """You help create a single consolidated ticket from multiple issue reports for ProjectHub.

Output ONLY a single JSON object with no markdown fences and no commentary.
Fields:
- title: string (summarize the combined issue)
- description: string (markdown summarizing reports, impact, and suggested fix)
- ticket_type: one of task, bug, story, epic
- priority: one of lowest, low, medium, high, highest
"""
    if context == ContentAssistContext.ISSUE_ME_TOO:
        return """You help a user write a short personal note when they experience the same issue as an existing report.

Output ONLY a single JSON object with no markdown fences and no commentary.
Fields:
- description: string (plain text, 1-3 sentences, first person, no markdown)
"""
    if context in (ContentAssistContext.ISSUE_CREATE, ContentAssistContext.ISSUE_EDIT):
        return """You help draft or update issue reports for ProjectHub.

Output ONLY a single JSON object with no markdown fences and no commentary.
Fields (include only those relevant to the request):
- title: string (concise problem statement)
- description: string (plain text, steps to reproduce, expected vs actual)
- priority: one of low, medium, high, critical
- source_url: string URL or null

Description must be plain text — no markdown.
For edits, apply only the changes the user requested.
"""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown context")


def _build_user_message(
    *,
    context: ContentAssistContext,
    prompt: str,
    current_fields: dict[str, Any] | None,
    reference_items: list[dict[str, Any]] | None,
) -> str:
    parts = [f"User request:\n{prompt.strip()}"]
    if current_fields:
        parts.append(f"Current fields (JSON):\n{json.dumps(current_fields, ensure_ascii=False)}")
    if reference_items:
        parts.append(
            "Reference issue reports (JSON array):\n"
            + json.dumps(reference_items, ensure_ascii=False)
        )
    if context == ContentAssistContext.TICKET_CREATE:
        parts.append("Create a new ticket from scratch.")
    elif context == ContentAssistContext.ISSUE_CREATE:
        parts.append("Create a new issue report from scratch.")
    elif context == ContentAssistContext.TICKET_FROM_REPORTS:
        parts.append("Create one consolidated ticket from the reference reports.")
    return "\n\n".join(parts)


def _normalize_generate_response(
    raw: dict[str, Any],
    context: ContentAssistContext,
) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if context in (
        ContentAssistContext.TICKET_CREATE,
        ContentAssistContext.TICKET_EDIT,
        ContentAssistContext.TICKET_FROM_REPORTS,
        ContentAssistContext.ISSUE_CREATE,
        ContentAssistContext.ISSUE_EDIT,
    ):
        title = _sanitize_str(raw.get("title"), max_len=500)
        if title:
            result["title"] = title
    if context != ContentAssistContext.ISSUE_ME_TOO or "description" in raw:
        desc = _sanitize_str(raw.get("description"))
        if desc:
            result["description"] = desc
    if context in (
        ContentAssistContext.TICKET_CREATE,
        ContentAssistContext.TICKET_EDIT,
        ContentAssistContext.TICKET_FROM_REPORTS,
    ):
        tt = _sanitize_ticket_type(
            raw.get("ticket_type"),
            allow_subtask=context != ContentAssistContext.TICKET_FROM_REPORTS,
        )
        if tt:
            result["ticket_type"] = tt
        pr = _sanitize_ticket_priority(raw.get("priority"))
        if pr:
            result["priority"] = pr
        if context != ContentAssistContext.TICKET_FROM_REPORTS:
            sp = _sanitize_story_points(raw.get("story_points"))
            if sp is not None:
                result["story_points"] = sp
    if context in (ContentAssistContext.ISSUE_CREATE, ContentAssistContext.ISSUE_EDIT):
        pr = _sanitize_issue_priority(raw.get("priority"))
        if pr:
            result["priority"] = pr
        url = _sanitize_str(raw.get("source_url"), max_len=2000)
        if url:
            result["source_url"] = url
    return result


async def generate_content(
    *,
    context: ContentAssistContext,
    prompt: str,
    current_fields: dict[str, Any] | None = None,
    reference_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM is not configured. Set LLM_PROVIDER and LLM_MODEL to use AI generation.",
        )

    system = _system_prompt_for_context(context)
    user_content = _build_user_message(
        context=context,
        prompt=prompt,
        current_fields=current_fields,
        reference_items=reference_items,
    )

    try:
        provider = get_llm_provider()
        response = await provider.chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
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

    raw = _extract_json(response.content or "")
    return _normalize_generate_response(raw, context)


async def translate_content(
    *,
    text: str,
    target_locale: str,
    content_format: str,
) -> dict[str, str]:
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM is not configured. Set LLM_PROVIDER and LLM_MODEL to use AI translation.",
        )

    locale_name = _LOCALE_NAMES.get(target_locale, target_locale)
    format_note = (
        "Preserve all markdown structure (headings, lists, code fences, links)."
        if content_format == "markdown"
        else "Output plain text only — no markdown."
    )

    system = f"""You translate text to {locale_name}.

If the text is already written in {locale_name}, return it unchanged.
{format_note}

Output ONLY the translated text with no JSON wrapper, no code fences, and no commentary.
"""

    try:
        provider = get_llm_provider()
        response = await provider.chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": text.strip()},
            ],
            max_tokens=4096,
            temperature=0.1,
        )
    except LLMConfigError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM translation failed: {exc}",
        ) from exc

    translated = (response.content or "").strip()
    if not translated:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM returned empty translation",
        )
    return {"translated_text": translated}
