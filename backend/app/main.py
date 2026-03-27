import logging
import uuid
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.deps import close_redis, init_redis
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.schemas.common import ErrorEnvelope, ErrorResponse

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_redis()
    from app.core.event_handlers import register_event_handlers
    register_event_handlers()

    from app.api.v1.endpoints.kb_templates import seed_builtin_templates
    from app.api.deps import async_session_factory
    async with async_session_factory() as session:
        await seed_builtin_templates(session)
        await session.commit()

    await logger.ainfo("application_startup", app_name=settings.APP_NAME)
    yield
    await close_redis()
    await logger.ainfo("application_shutdown", app_name=settings.APP_NAME)


class RequestIDMiddleware:
    """Pure ASGI middleware to inject and propagate request IDs."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode() or str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)

        async def send_with_request_id(message: dict) -> None:
            if message["type"] == "http.response.start":
                h = list(message.get("headers", []))
                h.append((b"x-request-id", request_id.encode()))
                message["headers"] = h
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            structlog.contextvars.unbind_contextvars("request_id")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="ProjectHub — enterprise project management platform with RBAC, workflows, sprints, boards and real-time collaboration.",
        version="1.0.0",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        lifespan=lifespan,
        openapi_tags=[
            {"name": "health", "description": "Service health probes"},
            {"name": "auth", "description": "Authentication & OIDC callbacks"},
            {"name": "users", "description": "User profile and admin management"},
            {"name": "organizations", "description": "Organization CRUD, membership, and settings"},
            {"name": "projects", "description": "Project CRUD, membership, archival, and settings"},
            {"name": "workflows", "description": "Workflow definitions, statuses, and transitions"},
            {"name": "epics", "description": "Epic CRUD within a project"},
            {"name": "tickets", "description": "Ticket CRUD, transitions, bulk ops, and CSV export"},
            {"name": "comments", "description": "Comment CRUD with @mention notification"},
            {"name": "labels", "description": "Label management for tickets"},
            {"name": "activity", "description": "Per-ticket activity log and project-level audit trail"},
            {"name": "custom_fields", "description": "Custom field definitions and values"},
            {"name": "sprints", "description": "Sprint lifecycle (plan, start, complete) and backlog management"},
            {"name": "boards", "description": "Kanban board configuration and ticket ordering"},
            {"name": "time_tracking", "description": "Work-log entries, estimates, and time reports"},
            {"name": "notifications", "description": "User notification list and read-status"},
            {"name": "webhooks", "description": "Webhook CRUD and delivery history"},
            {"name": "reports", "description": "Project reports: summary, velocity, burndown, CFD, cycle time, sprint report, and CSV exports"},
            {"name": "timeline", "description": "Gantt/timeline data for tickets"},
            {"name": "attachments", "description": "File uploads and downloads via S3 presigned URLs"},
            {"name": "dependencies", "description": "Ticket dependency links (blocks, blocked-by, relates-to)"},
            {"name": "ai", "description": "AI chat, conversations, and configuration"},
        ],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIDMiddleware)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID")
        envelope = ErrorEnvelope(
            error=ErrorResponse(
                code=f"HTTP_{exc.status_code}",
                message=str(exc.detail),
                request_id=request_id,
            )
        )
        return JSONResponse(status_code=exc.status_code, content=envelope.model_dump())

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID")
        await logger.aerror(
            "unhandled_exception",
            exc_type=type(exc).__name__,
            exc_message=str(exc),
            request_id=request_id,
        )
        envelope = ErrorEnvelope(
            error=ErrorResponse(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred.",
                request_id=request_id,
            )
        )
        return JSONResponse(status_code=500, content=envelope.model_dump())

    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    from app.websocket.handlers import router as ws_router
    app.include_router(ws_router)

    return app


app = create_app()
