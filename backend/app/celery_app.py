from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "sori",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.health",
        "app.tasks.schedule",
        "app.tasks.push",
        "app.tasks.analysis",
    ],
)

celery_app.conf.update(
    timezone="Asia/Seoul",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_prefetch_multiplier=1,
    # Beat schedule for periodic tasks
    beat_schedule={
        "check-call-schedules-every-minute": {
            "task": "app.tasks.schedule.check_schedules",
            "schedule": 60.0,  # Every 60 seconds
        },
        "sweep-missed-calls-every-5-minutes": {
            "task": "app.tasks.schedule.sweep_missed_calls",
            "schedule": 300.0,  # Every 5 minutes
        },
    },
)
