from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "projecthub",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "daily-project-snapshots": {
            "task": "generate_daily_snapshots",
            "schedule": 86400.0,
        },
        "notification-email-digests": {
            "task": "send_notification_digests",
            "schedule": 1800.0,  # every 30 minutes
        },
    },
)

celery_app.conf.include = [
    "app.tasks.snapshot_tasks",
    "app.tasks.webhook_tasks",
    "app.tasks.embedding_tasks",
    "app.tasks.notification_tasks",
]


@celery_app.task(name="health_check_task")
def health_check_task() -> dict[str, str]:
    return {"status": "ok"}
