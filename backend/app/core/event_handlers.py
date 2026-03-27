"""Event subscribers that broadcast domain events to WebSocket channels and Redis Pub/Sub."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import structlog

from app.core.events import (
    EVENT_COMMENT_ADDED,
    EVENT_COMMENT_DELETED,
    EVENT_COMMENT_EDITED,
    EVENT_SPRINT_COMPLETED,
    EVENT_SPRINT_STARTED,
    EVENT_TICKET_CREATED,
    EVENT_TICKET_DELETED,
    EVENT_TICKET_MOVED,
    EVENT_TICKET_STATUS_CHANGED,
    EVENT_TICKET_UPDATED,
    subscribe,
)
from app.websocket.manager import manager

logger = structlog.get_logger()


def _build_ws_message(
    event: str,
    channel: str,
    data: dict[str, Any],
    actor_id: str | None = None,
    actor_name: str | None = None,
) -> dict[str, Any]:
    msg: dict[str, Any] = {
        "type": "event",
        "channel": channel,
        "event": event,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if actor_id:
        msg["actor"] = {"id": actor_id, "display_name": actor_name or "Unknown"}
    return msg


async def _broadcast(channels: list[str], message: dict[str, Any], exclude_user: str | None = None) -> None:
    for ch in channels:
        message_copy = {**message, "channel": ch}
        await manager.broadcast_to_channel(ch, message_copy, exclude_user=exclude_user)


async def _publish_to_redis(channel: str, message: dict[str, Any]) -> None:
    try:
        from app.api.deps import get_redis
        redis = await get_redis()
        await redis.publish(channel, json.dumps(message, default=str))
    except Exception:
        pass


async def on_ticket_created(
    ticket_id: str,
    project_id: str,
    board_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    channels = [f"project:{project_id}"]
    if board_id:
        channels.append(f"board:{board_id}")
    msg = _build_ws_message("ticket.created", channels[0], {"ticket_id": ticket_id, **data}, actor_id, actor_name)
    await _broadcast(channels, msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_ticket_updated(
    ticket_id: str,
    project_id: str,
    board_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    channels = [f"ticket:{ticket_id}", f"project:{project_id}"]
    if board_id:
        channels.append(f"board:{board_id}")
    msg = _build_ws_message("ticket.updated", channels[0], {"ticket_id": ticket_id, **data}, actor_id, actor_name)
    await _broadcast(channels, msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_ticket_status_changed(
    ticket_id: str,
    project_id: str,
    board_id: str | None = None,
    from_status_id: str | None = None,
    to_status_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    channels = [f"ticket:{ticket_id}", f"project:{project_id}"]
    if board_id:
        channels.append(f"board:{board_id}")
    payload = {"ticket_id": ticket_id, "from_status_id": from_status_id, "to_status_id": to_status_id, **data}
    msg = _build_ws_message("ticket.transitioned", channels[0], payload, actor_id, actor_name)
    await _broadcast(channels, msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_ticket_deleted(
    ticket_id: str,
    project_id: str,
    board_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    channels = [f"ticket:{ticket_id}", f"project:{project_id}"]
    if board_id:
        channels.append(f"board:{board_id}")
    msg = _build_ws_message("ticket.deleted", channels[0], {"ticket_id": ticket_id}, actor_id, actor_name)
    await _broadcast(channels, msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_ticket_moved(
    ticket_id: str,
    project_id: str,
    board_id: str,
    from_status_id: str | None = None,
    to_status_id: str | None = None,
    board_rank: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    payload = {
        "ticket_id": ticket_id,
        "from_status_id": from_status_id,
        "to_status_id": to_status_id,
        "board_rank": board_rank,
    }
    msg = _build_ws_message("ticket.moved", f"board:{board_id}", payload, actor_id, actor_name)
    await _broadcast([f"board:{board_id}"], msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_comment_added(
    comment_id: str,
    ticket_id: str,
    project_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    msg = _build_ws_message(
        "comment.added", f"ticket:{ticket_id}",
        {"comment_id": comment_id, "ticket_id": ticket_id, **data},
        actor_id, actor_name,
    )
    await _broadcast([f"ticket:{ticket_id}"], msg, exclude_user=actor_id)
    if project_id:
        await _publish_to_redis(f"events:{project_id}", msg)


async def on_comment_edited(
    comment_id: str,
    ticket_id: str,
    project_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    msg = _build_ws_message(
        "comment.edited", f"ticket:{ticket_id}",
        {"comment_id": comment_id, "ticket_id": ticket_id, **data},
        actor_id, actor_name,
    )
    await _broadcast([f"ticket:{ticket_id}"], msg, exclude_user=actor_id)


async def on_comment_deleted(
    comment_id: str,
    ticket_id: str,
    project_id: str | None = None,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    msg = _build_ws_message(
        "comment.deleted", f"ticket:{ticket_id}",
        {"comment_id": comment_id, "ticket_id": ticket_id},
        actor_id, actor_name,
    )
    await _broadcast([f"ticket:{ticket_id}"], msg, exclude_user=actor_id)


async def on_sprint_started(
    sprint_id: str,
    project_id: str,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    msg = _build_ws_message(
        "sprint.started", f"project:{project_id}",
        {"sprint_id": sprint_id, **data},
        actor_id, actor_name,
    )
    await _broadcast([f"project:{project_id}"], msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


async def on_sprint_completed(
    sprint_id: str,
    project_id: str,
    actor_id: str | None = None,
    actor_name: str | None = None,
    **data: Any,
) -> None:
    msg = _build_ws_message(
        "sprint.completed", f"project:{project_id}",
        {"sprint_id": sprint_id, **data},
        actor_id, actor_name,
    )
    await _broadcast([f"project:{project_id}"], msg, exclude_user=actor_id)
    await _publish_to_redis(f"events:{project_id}", msg)


def register_event_handlers() -> None:
    """Register all event handlers. Called once at app startup."""
    subscribe(EVENT_TICKET_CREATED, on_ticket_created)
    subscribe(EVENT_TICKET_UPDATED, on_ticket_updated)
    subscribe(EVENT_TICKET_STATUS_CHANGED, on_ticket_status_changed)
    subscribe(EVENT_TICKET_DELETED, on_ticket_deleted)
    subscribe(EVENT_TICKET_MOVED, on_ticket_moved)
    subscribe(EVENT_COMMENT_ADDED, on_comment_added)
    subscribe(EVENT_COMMENT_EDITED, on_comment_edited)
    subscribe(EVENT_COMMENT_DELETED, on_comment_deleted)
    subscribe(EVENT_SPRINT_STARTED, on_sprint_started)
    subscribe(EVENT_SPRINT_COMPLETED, on_sprint_completed)
