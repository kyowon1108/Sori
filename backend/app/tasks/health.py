"""
Health check task for verifying Celery is working.
"""
from app.celery_app import celery_app
from app.tasks.base import get_task_db


@celery_app.task(name="app.tasks.health.ping")
def ping():
    """Simple ping task to verify Celery is working."""
    return {"status": "pong", "message": "Celery is healthy"}


@celery_app.task(name="app.tasks.health.db_check")
def db_check():
    """Check database connectivity from Celery worker."""
    with get_task_db() as db:
        result = db.execute("SELECT 1").scalar()
        return {"status": "ok", "db_result": result}
