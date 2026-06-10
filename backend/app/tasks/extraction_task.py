"""
Celery task: orchestrates parallel PDF extraction using a thread pool.
For massive scale (1000+ files), this delegates to PySpark (see spark_runner.py).
"""
import asyncio
import json
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import List

from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.core.security import decrypt_secret
from app.models.user import User
from app.models.user import User
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus
from app.services.pdf.extractor import PDFExtractor
from app.services.llm.claude_service import ClaudeService
from app.services.llm.openai_service import OpenAIService, get_llm_service

# Sync engine for Celery (not async) - lazy init to avoid startup connection attempt
sync_engine = None
SyncSession = None

def _get_sync_session():
    global sync_engine, SyncSession
    if sync_engine is None:
        sync_engine = create_engine(
            settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"),
            pool_size=10,
        )
        SyncSession = sessionmaker(bind=sync_engine)
    return SyncSession()


@shared_task(bind=True, max_retries=3)
def run_extraction_job(self, job_id: str):
    """Main Celery task. Fetches PDFs, runs parallel extraction, saves results."""
    db: Session = _get_sync_session()
    try:
        job: ExtractionJob = db.query(ExtractionJob).filter_by(id=job_id).first()
        if not job:
            print(f"[TASK] job {job_id} not found in DB", flush=True)
            return
        print(f"[TASK] job={job_id} provider={job.storage_provider!r} path={job.storage_path!r}", flush=True)

        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        db.commit()

        # Resolve template
        template = job.template
        columns = template.columns if template else []

        # Resolve API key
        api_key = None
        if job.use_user_api_key:
            user = job.user
            if job.llm_provider == "openai" and user.openai_api_key_enc:
                api_key = decrypt_secret(user.openai_api_key_enc)
            elif user.anthropic_api_key_enc:
                api_key = decrypt_secret(user.anthropic_api_key_enc)

        llm = get_llm_service(job.llm_provider, api_key)

        # Collect PDF paths
        pdf_paths = _collect_pdfs(job, db)
        job.total_files = len(pdf_paths)
        db.commit()

        # Process with thread pool (max 16 workers)
        max_workers = min(16, len(pdf_paths)) if pdf_paths else 1
        extractor = PDFExtractor()

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(_process_single_pdf, extractor, llm, path, columns, job.llm_model): path
                for path in pdf_paths
            }
            for future in as_completed(futures):
                path = futures[future]
                try:
                    result_data = future.result()
                    result = ExtractionResult(
                        job_id=job.id,
                        file_name=os.path.basename(path),
                        file_path=path,
                        extracted_data=result_data.get("extracted_data"),
                        confidence_scores=result_data.get("confidence_scores"),
                        processing_time_ms=result_data.get("processing_time_ms"),
                        ocr_used=result_data.get("ocr_used", False),
                    )
                    db.add(result)
                    job.processed_files += 1
                except Exception as exc:
                    result = ExtractionResult(
                        job_id=job.id,
                        file_name=os.path.basename(path),
                        file_path=path,
                        error_message=str(exc),
                    )
                    db.add(result)
                    job.failed_files += 1
                db.commit()

        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        db.rollback()
        job = db.query(ExtractionJob).filter_by(id=job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


def _process_single_pdf(extractor: PDFExtractor, llm, pdf_path: str, columns: list, model: str) -> dict:
    import time
    start = time.time()
    pages = extractor.extract_text(pdf_path)
    full_text = "\n\n".join(p["text"] for p in pages)
    ocr_used = any(p["ocr_used"] for p in pages)

    # Run async LLM call in a new event loop (thread context)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(llm.extract_data(full_text, columns, model or "claude-3-haiku-20240307"))
    loop.close()

    elapsed_ms = int((time.time() - start) * 1000)
    return {**result, "processing_time_ms": elapsed_ms, "ocr_used": ocr_used}


def _collect_pdfs(job: ExtractionJob, db: Session) -> List[str]:
    """Download PDFs from cloud or collect local paths."""
    import logging
    logger = logging.getLogger(__name__)

    if job.storage_provider == "local":
        if job.storage_path and os.path.isdir(job.storage_path):
            return [
                os.path.join(job.storage_path, f)
                for f in os.listdir(job.storage_path)
                if f.lower().endswith(".pdf")
            ]
        return []

    creds = json.loads(decrypt_secret(job.storage_credentials_enc)) if job.storage_credentials_enc else {}
    tmpdir = tempfile.mkdtemp(prefix="docuextract_")

    # For S3 with no user-provided creds, fall back to system env var credentials
    if job.storage_provider == "s3" and not creds:
        creds = {
            "access_key": settings.AWS_ACCESS_KEY_ID,
            "secret_key": settings.AWS_SECRET_ACCESS_KEY,
            "region": settings.AWS_DEFAULT_REGION,
        }

    from app.services.storage.s3_service import get_storage_service
    svc = get_storage_service(job.storage_provider, creds)
    local_paths = []

    if job.storage_provider == "s3":
        bucket, prefix = (job.storage_path or "/").split("/", 1) if "/" in (job.storage_path or "") else (job.storage_path, "")
        print(f"[S3] storage_path={job.storage_path!r} bucket={bucket!r} prefix={prefix!r} region={creds.get('region')!r}", flush=True)
        keys = svc.list_pdfs(bucket, prefix)
        print(f"[S3] list_pdfs returned {len(keys)} keys: {keys}", flush=True)
        for key in keys:
            local_paths.append(svc.download_pdf(bucket, key, tmpdir))
        return local_paths
    elif job.storage_provider == "google_drive":
        files = svc.list_pdfs(job.storage_path)
        for f in files:
            local_paths.append(svc.download_pdf(f["id"], tmpdir, f["name"]))
    elif job.storage_provider == "dropbox":
        files = svc.list_pdfs(job.storage_path)
        for f in files:
            local_paths.append(svc.download_pdf(f["path"], tmpdir))

    return local_paths
