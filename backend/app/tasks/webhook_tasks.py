"""Celery tasks for webhook delivery with retry logic."""
from __future__ import annotations

import hashlib
import hmac
import json
import time

import httpx

from app.tasks.celery_app import celery_app

MAX_RETRIES = 5
RETRY_BACKOFF = [10, 30, 60, 300, 600]


@celery_app.task(
    name="deliver_webhook",
    bind=True,
    max_retries=MAX_RETRIES,
    default_retry_delay=10,
)
def deliver_webhook(
    self,
    webhook_id: str,
    url: str,
    secret: str | None,
    event_type: str,
    payload: dict,
) -> dict:
    """Deliver a webhook payload to the configured URL."""
    body = json.dumps(payload, default=str)
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event_type,
        "X-Webhook-Delivery": self.request.id or "",
    }

    if secret:
        signature = hmac.new(
            secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()
        headers["X-Webhook-Signature-256"] = f"sha256={signature}"

    start = time.monotonic()
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, content=body, headers=headers)

        duration_ms = int((time.monotonic() - start) * 1000)
        success = 200 <= response.status_code < 300

        result = {
            "webhook_id": webhook_id,
            "event_type": event_type,
            "response_status": response.status_code,
            "duration_ms": duration_ms,
            "success": success,
            "attempt": self.request.retries + 1,
        }

        if not success and self.request.retries < MAX_RETRIES:
            delay = RETRY_BACKOFF[min(self.request.retries, len(RETRY_BACKOFF) - 1)]
            raise self.retry(countdown=delay)

        return result

    except httpx.RequestError as exc:
        duration_ms = int((time.monotonic() - start) * 1000)

        if self.request.retries < MAX_RETRIES:
            delay = RETRY_BACKOFF[min(self.request.retries, len(RETRY_BACKOFF) - 1)]
            raise self.retry(countdown=delay, exc=exc)

        return {
            "webhook_id": webhook_id,
            "event_type": event_type,
            "error": str(exc),
            "duration_ms": duration_ms,
            "success": False,
            "attempt": self.request.retries + 1,
        }
