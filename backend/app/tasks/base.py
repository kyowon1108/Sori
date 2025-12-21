"""
Base utilities for Celery tasks.

Since we use synchronous SQLAlchemy, we create a fresh session
for each task execution using a context manager.
"""
from contextlib import contextmanager
from app.database import SessionLocal


@contextmanager
def get_task_db():
    """
    Context manager for database sessions in Celery tasks.

    Usage:
        with get_task_db() as db:
            # perform database operations
            db.query(Model).filter(...).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
