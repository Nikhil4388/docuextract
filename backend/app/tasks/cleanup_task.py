"""
Periodic cleanup task — runs every 7 days via Celery Beat.

What gets deleted:
  - ExtractionJob rows older than 7 days (any status)
  - ExtractionResult rows  — cascaded automatically (FK + cascade="all, delete-orphan")
  - AuditLog rows linked to those jobs — same cascade
  - Uploaded PDF files in UPLOAD_DIR that belong to deleted jobs

What is NEVER touched:
  - ColumnTemplate rows
  - User accounts
  - Any other user data
"""

import logging
import os
import shutil
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User  # noqa: F401 — resolves SQLAlchemy mapper for User relationship
from app.models.extraction import ExtractionJob, AuditLog

log = logging.getLogger(__name__)

# ── Sync DB session (Celery runs in forked process, not async) ────────────────
_engine = None
_Session = None


def _get_session():
    global _engine, _Session
    if _engine is None:
        sync_url = settings.DATABASE_URL.replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        ).replace("postgresql+asyncio://", "postgresql+psycopg2://")
        _engine = create_engine(sync_url, pool_pre_ping=True, pool_size=3)
        _Session = sessionmaker(bind=_engine)
    return _Session()


# ── Main task ─────────────────────────────────────────────────────────────────
@shared_task(name="app.tasks.cleanup_task.cleanup_old_jobs", bind=True, max_retries=3)
def cleanup_old_jobs(self):
    """Delete all jobs (and their results) older than 7 days to free storage."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    log.info("[Cleanup] Starting — deleting jobs created before %s", cutoff.isoformat())

    session = _get_session()
    deleted_jobs = 0
    deleted_files = 0
    errors = []

    try:
        # Fetch jobs older than 7 days
        old_jobs = (
            session.query(ExtractionJob)
            .filter(ExtractionJob.created_at < cutoff)
            .all()
        )

        if not old_jobs:
            log.info("[Cleanup] No jobs older than 7 days — nothing to do.")
            return {"deleted_jobs": 0, "deleted_files": 0}

        log.info("[Cleanup] Found %d job(s) to delete.", len(old_jobs))

        for job in old_jobs:
            job_id = str(job.id)
            try:
                # ── Delete uploaded files for this job ─────────────────────────
                # Files live in UPLOAD_DIR/<job_id>/  (see extraction_task.py)
                job_upload_dir = os.path.join(settings.UPLOAD_DIR, job_id)
                if os.path.isdir(job_upload_dir):
                    shutil.rmtree(job_upload_dir, ignore_errors=True)
                    log.info("[Cleanup] Removed upload dir: %s", job_upload_dir)
                    deleted_files += 1

                # ── Delete orphan AuditLog rows not already cascaded ───────────
                # (cascade="all, delete-orphan" on the relationship handles most,
                #  but belt-and-suspenders for any rows without a job FK path)
                session.query(AuditLog).filter(AuditLog.job_id == job.id).delete(
                    synchronize_session=False
                )

                # ── Delete the job — cascade takes care of ExtractionResult ────
                session.delete(job)
                deleted_jobs += 1

            except Exception as exc:
                log.error("[Cleanup] Failed to delete job %s: %s", job_id, exc)
                errors.append({"job_id": job_id, "error": str(exc)})

        session.commit()

        log.info(
            "[Cleanup] Done. deleted_jobs=%d  deleted_file_dirs=%d  errors=%d",
            deleted_jobs, deleted_files, len(errors),
        )
        return {
            "deleted_jobs": deleted_jobs,
            "deleted_files": deleted_files,
            "errors": errors,
        }

    except Exception as exc:
        session.rollback()
        log.exception("[Cleanup] Unexpected error: %s", exc)
        raise self.retry(exc=exc, countdown=60 * 60)  # retry in 1 hour on failure

    finally:
        session.close()
