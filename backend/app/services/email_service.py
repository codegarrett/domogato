"""Email sending service using aiosmtplib + Jinja2 templates."""
from __future__ import annotations

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

import structlog
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = structlog.get_logger()

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env: Environment | None = None


def _get_jinja_env() -> Environment:
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html"]),
        )
    return _jinja_env


def render_template(template_name: str, context: dict[str, Any]) -> str:
    env = _get_jinja_env()
    ctx = {
        "app_name": settings.APP_NAME,
        "app_base_url": settings.APP_BASE_URL.rstrip("/"),
        **context,
    }
    tmpl = env.get_template(template_name)
    return tmpl.render(ctx)


async def send_email(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    if not settings.SMTP_ENABLED:
        logger.debug("email_skipped", reason="SMTP disabled", to=to_email)
        return False

    try:
        import aiosmtplib

        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            use_tls=settings.SMTP_USE_TLS,
        )
        logger.info("email_sent", to=to_email, subject=subject)
        return True
    except Exception:
        logger.exception("email_send_failed", to=to_email, subject=subject)
        return False


async def send_notification_email(
    *,
    to_email: str,
    event_type: str,
    context: dict[str, Any],
) -> bool:
    template_map = {
        "ticket_assigned": ("ticket_assigned.html", "Ticket Assigned: {title}"),
        "ticket_commented": ("ticket_commented.html", "New Comment on {title}"),
        "ticket_status_changed": ("ticket_status_changed.html", "Status Changed: {title}"),
        "mentioned": ("mentioned.html", "You were mentioned in {title}"),
        "sprint_started": ("sprint_started.html", "Sprint Started: {title}"),
        "sprint_completed": ("sprint_completed.html", "Sprint Completed: {title}"),
    }

    entry = template_map.get(event_type)
    if not entry:
        logger.warning("no_email_template", event_type=event_type)
        return False

    template_name, subject_pattern = entry
    subject = f"[{settings.APP_NAME}] {subject_pattern.format(**context)}"
    html_body = render_template(template_name, context)

    return await send_email(to_email=to_email, subject=subject, html_body=html_body)
