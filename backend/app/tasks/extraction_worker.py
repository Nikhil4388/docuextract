"""
Background extraction worker — runs directly in the FastAPI process.
No Celery or Redis required. Uses FastAPI BackgroundTasks.
"""
import asyncio
import json
import os
import tempfile
import time
from datetime import datetime
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import decrypt_secret
from app.core.config import settings
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus
from app.services.pdf.extractor import PDFExtractor
from app.services.llm.openai_service import get_llm_service


async def run_extraction_bg(job_id: str) -> None:
    """
    FastAPI BackgroundTask entry point.
    Runs after the HTTP response is sent — no Celery or Redis needed.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Load job with relationships eagerly
            result = await db.execute(
                select(ExtractionJob)
                .options(
                    selectinload(ExtractionJob.template),
                    selectinload(ExtractionJob.user),
                )
                .where(ExtractionJob.id == job_id)
            )
            job: ExtractionJob = result.scalar_one_or_none()
            if not job:
                print(f"[BG] job {job_id} not found in DB", flush=True)
                return

            print(f"[BG] starting job={job_id} provider={job.storage_provider!r} path={job.storage_path!r}", flush=True)

            job.status = JobStatus.PROCESSING
            job.status_message = "Starting extraction…"
            job.started_at = datetime.utcnow()
            await db.commit()

            # Resolve template columns
            columns = job.template.columns if job.template else []

            # Resolve user API key if requested
            api_key = None
            if job.use_user_api_key:
                user = job.user
                if job.llm_provider == "openai" and user.openai_api_key_enc:
                    api_key = decrypt_secret(user.openai_api_key_enc)
                elif user.anthropic_api_key_enc:
                    api_key = decrypt_secret(user.anthropic_api_key_enc)

            llm = get_llm_service(str(job.llm_provider), api_key)

            # Collect PDFs (sync S3/local — run in thread to not block event loop)
            job.status_message = "Downloading files…"
            await db.commit()

            pdf_paths: List[str] = await asyncio.to_thread(
                _collect_pdfs_sync,
                str(job.storage_provider),
                job.storage_path,
                job.storage_credentials_enc,
            )

            job.total_files = len(pdf_paths)
            job.status_message = f"Found {len(pdf_paths)} file{'s' if len(pdf_paths) != 1 else ''}, extracting with AI…"
            await db.commit()
            print(f"[BG] {len(pdf_paths)} PDFs to process", flush=True)

            # Process each PDF sequentially
            extractor = PDFExtractor()
            for path in pdf_paths:
                fname = os.path.basename(path)
                try:
                    result_data = await _process_single_pdf(extractor, llm, path, columns, job.llm_model)
                    row = ExtractionResult(
                        job_id=job.id,
                        file_name=fname,
                        file_path=path,
                        extracted_data=result_data.get("extracted_data"),
                        confidence_scores=result_data.get("confidence_scores"),
                        processing_time_ms=result_data.get("processing_time_ms"),
                        ocr_used=result_data.get("ocr_used", False),
                    )
                    db.add(row)
                    job.processed_files += 1
                    print(f"[BG] processed {fname} in {result_data.get('processing_time_ms')}ms", flush=True)
                except Exception as exc:
                    print(f"[BG] failed {fname}: {exc}", flush=True)
                    row = ExtractionResult(
                        job_id=job.id,
                        file_name=fname,
                        file_path=path,
                        error_message=str(exc),
                    )
                    db.add(row)
                    job.failed_files += 1

                job.status_message = f"Processed {job.processed_files + job.failed_files} of {job.total_files} files…"
                await db.commit()

            # Set final status based on success/failure counts
            if job.failed_files == 0:
                job.status = JobStatus.COMPLETED          # all succeeded
            elif job.processed_files == 0:
                job.status = JobStatus.FAILED             # all failed
            else:
                job.status = JobStatus.PARTIAL            # mixed — some succeeded, some failed

            job.status_message = None
            job.completed_at = datetime.utcnow()
            await db.commit()
            print(f"[BG] job={job_id} final_status={job.status} ok={job.processed_files} failed={job.failed_files}", flush=True)

        except Exception as exc:
            print(f"[BG] unhandled error for job={job_id}: {exc}", flush=True)
            await db.rollback()
            # Open a fresh session to mark job as failed
            async with AsyncSessionLocal() as db2:
                try:
                    res = await db2.execute(
                        select(ExtractionJob).where(ExtractionJob.id == job_id)
                    )
                    job = res.scalar_one_or_none()
                    if job:
                        job.status = JobStatus.FAILED
                        job.error_message = str(exc)
                        job.status_message = None
                        await db2.commit()
                except Exception as e2:
                    print(f"[BG] could not mark job failed: {e2}", flush=True)


async def _process_single_pdf(
    extractor: PDFExtractor,
    llm,
    pdf_path: str,
    columns: list,
    model: str,
) -> dict:
    """Extract text (sync, in thread) then run LLM extraction (async)."""
    start = time.time()

    # PDF text extraction is CPU-bound — run in thread pool
    pages = await asyncio.to_thread(extractor.extract_text, pdf_path)
    full_text = "\n\n".join(p["text"] for p in pages if p["text"])
    ocr_used = any(p["ocr_used"] for p in pages)

    # For scanned pages, pass images directly to Claude Vision for max accuracy
    page_images = [p["image_b64"] for p in pages if p.get("image_b64")]

    result = await llm.extract_data(
        full_text,
        columns,
        model or "claude-haiku-4-5-20251001",
        page_images=page_images if page_images else None,
    )

    elapsed_ms = int((time.time() - start) * 1000)
    return {**result, "processing_time_ms": elapsed_ms, "ocr_used": ocr_used}


def _collect_pdfs_sync(
    storage_provider: str,
    storage_path: str,
    storage_credentials_enc: str,
) -> List[str]:
    """
    Sync: download PDFs from S3/Drive/Dropbox or list local paths.
    Called via asyncio.to_thread — does not block the event loop.
    """
    if storage_provider == "local":
        if storage_path and os.path.isdir(storage_path):
            return [
                os.path.join(storage_path, f)
                for f in os.listdir(storage_path)
                if f.lower().endswith(".pdf")
            ]
        return []

    creds = json.loads(decrypt_secret(storage_credentials_enc)) if storage_credentials_enc else {}
    tmpdir = tempfile.mkdtemp(prefix="docuextract_")

    # Fall back to system AWS credentials for S3
    if storage_provider == "s3" and not creds:
        creds = {
            "access_key": settings.AWS_ACCESS_KEY_ID,
            "secret_key": settings.AWS_SECRET_ACCESS_KEY,
            "region": settings.AWS_DEFAULT_REGION,
        }

    from app.services.storage.s3_service import get_storage_service
    svc = get_storage_service(storage_provider, creds)

    if storage_provider == "s3":
        bucket, prefix = (
            (storage_path or "/").split("/", 1)
            if "/" in (storage_path or "")
            else (storage_path, "")
        )
        print(f"[BG/S3] bucket={bucket!r} prefix={prefix!r}", flush=True)
        keys = svc.list_pdfs(bucket, prefix)
        print(f"[BG/S3] found {len(keys)} PDFs: {keys}", flush=True)
        return [svc.download_pdf(bucket, key, tmpdir) for key in keys]

    elif storage_provider == "google_drive":
        files = svc.list_pdfs(storage_path)
        return [svc.download_pdf(f["id"], tmpdir, f["name"]) for f in files]

    elif storage_provider == "dropbox":
        files = svc.list_pdfs(storage_path)
        return [svc.download_pdf(f["path"], tmpdir) for f in files]

    return []
