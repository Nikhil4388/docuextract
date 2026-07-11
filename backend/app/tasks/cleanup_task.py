"""
Periodic cleanup task — runs every 24 hours via Celery Beat.

What gets deleted (jobs older than 3 days):
  - S3 objects under the job's storage_path prefix
  - ExtractionJob rows (cascade deletes ExtractionResult + AuditLog)
  - Local UPLOAD_DIR files (fallback for local-storage jobs)

What is NEVER touched:
  - ColumnTemplate rows
  - User accounts
  - Any other user data
"""

import logging
import os
import shutil
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError
from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User  # noqa: F401 — resolves SQLAlchemy mapper for User relationship
from app.models.extraction import ExtractionJob, AuditLog

log = logging.getLogger(__name__)

RETENTION_DAYS = 3  # delete jobs + S3 files older than this

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


def _delete_s3_prefix(storage_path: str) -> int:
    """
    Delete all S3 objects under a job's storage_path prefix.
    storage_path format: "bucket/prefix"  (set by upload_files endpoint)
    Returns number of objects deleted.
    """
    if not storage_path or "/" not in storage_path:
        return 0
    bucket, prefix = storage_path.split("/", 1)
    if not bucket or not prefix:
        return 0

    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_DEFAULT_REGION,
        )

        # List all objects under the prefix
        paginator = s3.get_paginator("list_objects_v2")
        keys_to_delete = []
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                keys_to_delete.append({"Key": obj["Key"]})

        if not keys_to_delete:
            return 0

        # S3 delete_objects supports up to 1000 keys per call
        for i in range(0, len(keys_to_delete), 1000):
            batch = keys_to_delete[i:i + 1000]
            s3.delete_objects(Bucket=bucket, Delete={"Objects": batch, "Quiet": True})

        log.info("[Cleanup] S3: deleted %d object(s) from s3://%s/%s", len(keys_to_delete), bucket, prefix)
        return len(keys_to_delete)

    except ClientError as exc:
        log.error("[Cleanup] S3 deletion failed for %s: %s", storage_path, exc)
        return 0


# ── Main task ─────────────────────────────────────────────────────────────────
@shared_task(name="app.tasks.cleanup_task.cleanup_old_jobs", bind=True, max_retries=3)
def cleanup_old_jobs(self):
    """Delete all jobs (and their S3 files) older than RETENTION_DAYS days."""
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    log.info("[Cleanup] Starting — deleting jobs created before %s (%d-day retention)",
             cutoff.isoformat(), RETENTION_DAYS)

    session = _get_session()
    deleted_jobs = 0
    deleted_s3_objects = 0
    deleted_local_dirs = 0
    errors = []

    try:
        old_jobs = (
            session.query(ExtractionJob)
            .filter(ExtractionJob.created_at < cutoff)
            .all()
        )

        if not old_jobs:
            log.info("[Cleanup] No jobs older than %d days — nothing to do.", RETENTION_DAYS)
            return {"deleted_jobs": 0, "deleted_s3_objects": 0}

        log.info("[Cleanup] Found %d job(s) to delete.", len(old_jobs))

        for job in old_jobs:
            job_id = str(job.id)
            try:
                # ── Delete S3 files ────────────────────────────────────────────
                if job.storage_provider == "s3" and job.storage_path:
                    n = _delete_s3_prefix(job.storage_path)
                    deleted_s3_objects += n

                # ── Delete local upload dir (local-storage fallback) ───────────
                job_upload_dir = os.path.join(settings.UPLOAD_DIR, job_id)
                if os.path.isdir(job_upload_dir):
                    shutil.rmtree(job_upload_dir, ignore_errors=True)
                    deleted_local_dirs += 1

                # ── Delete AuditLog rows then the job (cascade: results too) ───
                session.query(AuditLog).filter(AuditLog.job_id == job.id).delete(
                    synchronize_session=False
                )
                session.delete(job)
                deleted_jobs += 1

            except Exception as exc:
                log.error("[Cleanup] Failed to delete job %s: %s", job_id, exc)
                errors.append({"job_id": job_id, "error": str(exc)})

        session.commit()

        log.info(
            "[Cleanup] Done. deleted_jobs=%d  s3_objects=%d  local_dirs=%d  errors=%d",
            deleted_jobs, deleted_s3_objects, deleted_local_dirs, len(errors),
        )
        return {
            "deleted_jobs": deleted_jobs,
            "deleted_s3_objects": deleted_s3_objects,
            "deleted_local_dirs": deleted_local_dirs,
            "errors": errors,
        }

    except Exception as exc:
        session.rollback()
        log.exception("[Cleanup] Unexpected error: %s", exc)
        raise self.retry(exc=exc, countdown=60 * 60)

    finally:
        session.close()
