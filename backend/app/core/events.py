"""Lightweight in-process event bus for publishing domain events."""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable, Coroutine

import structlog

EventHandler = Callable[..., Coroutine[Any, Any, None]]

_handlers: dict[str, list[EventHandler]] = defaultdict(list)

logger = structlog.get_logger()


def subscribe(event_type: str, handler: EventHandler) -> None:
    _handlers[event_type].append(handler)


async def publish(event_type: str, **payload: Any) -> None:
    handlers = _handlers.get(event_type, [])
    for handler in handlers:
        try:
            await handler(**payload)
        except Exception:
            await logger.awarning(
                "event_handler_error", event_type=event_type, handler=handler.__name__,
            )


EVENT_TICKET_CREATED = "ticket.created"
EVENT_TICKET_UPDATED = "ticket.updated"
EVENT_TICKET_STATUS_CHANGED = "ticket.status_changed"
EVENT_TICKET_DELETED = "ticket.deleted"
EVENT_TICKET_MOVED = "ticket.moved"
EVENT_COMMENT_ADDED = "comment.added"
EVENT_COMMENT_EDITED = "comment.edited"
EVENT_COMMENT_DELETED = "comment.deleted"
EVENT_ATTACHMENT_ADDED = "attachment.added"
EVENT_ATTACHMENT_DELETED = "attachment.deleted"
EVENT_MEMBER_ADDED = "member.added"
EVENT_SPRINT_STARTED = "sprint.started"
EVENT_SPRINT_COMPLETED = "sprint.completed"
