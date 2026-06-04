"""Admin-only debug SSE events for AI agent troubleshooting."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from app.models.user import User


def debug_payload(user: User, event: str, data: dict) -> dict | None:
    if not user.is_system_admin:
        return None
    return {
        "type": "debug",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "data": data,
    }


def maybe_debug_sse(user: User, event: str, data: dict) -> str | None:
    payload = debug_payload(user, event, data)
    if payload is None:
        return None
    return f"data: {json.dumps(payload)}\n\n"
