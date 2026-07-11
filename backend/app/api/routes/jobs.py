from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from typing import List
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import io

from app.core.database import get_db
from app.core.security import encrypt_secret
from app.core.config import settings
from app.models.user import User
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus, StorageProvider, LLMProvider
from app.api.deps import get_current_user
from app.services.extraction_service import ExtractionService

router = APIRouter(prefix="/jobs", tags=["Extraction Jobs"])

from app.tasks.cleanup_task import cleanup_old_jobs as _cleanup_task


class JobCreate(BaseModel):
    name: str
    template_id: str
    storage_provider: StorageProvider = StorageProvider.LOCAL
    storage_path: Optional[str] = None
    storage_credentials: Optional[Dict[str, str]] = None
    llm_provider: LLMProvider = LLMProvider.CLAUDE
    llm_model: Optional[str] = None
    use_user_api_key: bool = False


class JobResponse(BaseModel):
    id: str
    name: str
    status: str
    total_files: int
    processed_files: int
    failed_files: int
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    status_message: Optional[str]
    error_message: Optional[str]


class ResultRow(BaseModel):
    id: str
    file_name: str
    extracted_data: Optional[Dict[str, Any]]
    confidence_scores: Optional[Dict[str, float]]
    processing_time_ms: Optional[int]
    error_message: Optional[str]


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    result = await db.execute(
        select(ExtractionJob)
        .where(ExtractionJob.user_id == current_user.id)
        .order_by(ExtractionJob.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    jobs = result.scalars().all()
    return [_job_to_response(j) for j in jobs]


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(
    payload: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ── Job limit gate ─────────────────────────────────────────────────────
    jobs_used = current_user.jobs_used or 0
    # Admin/test accounts bypass all limits
    if current_user.email in settings.admin_email_list:
        pass  # unlimited — no gate
    elif not current_user.is_subscribed:
        if jobs_used >= settings.FREE_JOB_LIMIT:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "FREE_LIMIT_REACHED",
                    "message": f"You've used your {settings.FREE_JOB_LIMIT} free extractions. Donate $10 to unlock {settings.PAID_JOB_LIMIT} jobs.",
                    "jobs_used": jobs_used,
                    "free_limit": settings.FREE_JOB_LIMIT,
                    "paid_limit": settings.PAID_JOB_LIMIT,
                }
            )
    elif jobs_used >= settings.PAID_JOB_LIMIT:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "PAID_LIMIT_REACHED",
                "message": f"You've used all {settings.PAID_JOB_LIMIT} jobs from your donation. Please donate again to top up.",
                "jobs_used": jobs_used,
                "paid_limit": settings.PAID_JOB_LIMIT,
            }
        )

    creds_enc = None
    if payload.storage_credentials:
        import json
        creds_enc = encrypt_secret(json.dumps(payload.storage_credentials))

    job = ExtractionJob(
        user_id=current_user.id,
        template_id=payload.template_id,
        name=payload.name,
        storage_provider=payload.storage_provider,
        storage_path=payload.storage_path,
        storage_credentials_enc=creds_enc,
        llm_provider=payload.llm_provider,
        llm_model=payload.llm_model,
        use_user_api_key=payload.use_user_api_key,
        status=JobStatus.PENDING,
    )
    db.add(job)
    # Increment usage counter (even for subscribers, so we track total)
    current_user.jobs_used = (current_user.jobs_used or 0) + 1
    await db.commit()  # Commit BEFORE dispatching so worker can find the job

    # Dispatch Celery task explicitly to the extraction queue
    from app.tasks.extraction_task import run_extraction_job
    task = run_extraction_job.apply_async(args=[str(job.id)], queue="extraction")
    job.celery_task_id = task.id
    await db.commit()

    return _job_to_response(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_job_or_404(job_id, current_user.id, db)
    return _job_to_response(job)


@router.delete("/{job_id}", status_code=204)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_job_or_404(job_id, current_user.id, db)
    if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
        raise HTTPException(status_code=400, detail="Cannot cancel a finished job")
    if job.celery_task_id:
        from app.tasks.celery_app import celery_app
        celery_app.control.revoke(job.celery_task_id, terminate=True)
    job.status = JobStatus.CANCELLED


@router.get("/{job_id}/results", response_model=List[ResultRow])
async def get_results(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
):
    job = await _get_job_or_404(job_id, current_user.id, db)
    query = select(ExtractionResult).where(ExtractionResult.job_id == job.id)
    if search:
        query = query.where(ExtractionResult.file_name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()
    return [
        ResultRow(
            id=str(r.id),
            file_name=r.file_name,
            extracted_data=r.extracted_data,
            confidence_scores=r.confidence_scores,
            processing_time_ms=r.processing_time_ms,
            error_message=r.error_message,
        )
        for r in rows
    ]


@router.get("/{job_id}/export/excel")
async def export_excel(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import pandas as pd
    job = await _get_job_or_404(job_id, current_user.id, db)
    result = await db.execute(
        select(ExtractionResult).where(ExtractionResult.job_id == job.id)
    )
    rows = result.scalars().all()

    records = []
    for r in rows:
        row = {"file_name": r.file_name}
        if r.extracted_data:
            row.update(r.extracted_data)
        # Add overall confidence % column
        if r.confidence_scores:
            scores = [v for v in r.confidence_scores.values() if isinstance(v, (int, float))]
            avg_confidence = round((sum(scores) / len(scores)) * 100) if scores else None
            row["_confidence_%"] = f"{avg_confidence}%" if avg_confidence is not None else "—"
            # Add per-field confidence if any field scored low (< 70%)
            low_fields = [k for k, v in r.confidence_scores.items() if isinstance(v, (int, float)) and v < 0.7]
            row["_low_confidence_fields"] = ", ".join(low_fields) if low_fields else ""
        records.append(row)

    df = pd.DataFrame(records)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Extracted Data")
    buf.seek(0)

    filename = f"{job.name.replace(' ', '_')}_results.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Admin: manual cleanup trigger ────────────────────────────────────────────
@router.post("/admin/trigger-cleanup", status_code=200)
async def trigger_cleanup(current_user: User = Depends(get_current_user)):
    """
    Admin-only: immediately enqueue the 7-day cleanup task.
    Useful for testing or emergency data purges.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    task = _cleanup_task.delay()
    return {"message": "Cleanup task queued", "task_id": task.id}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_job_or_404(job_id: str, user_id, db: AsyncSession) -> ExtractionJob:
    result = await db.execute(
        select(ExtractionJob).where(
            ExtractionJob.id == job_id,
            ExtractionJob.user_id == user_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _job_to_response(job: ExtractionJob) -> JobResponse:
    return JobResponse(
        id=str(job.id),
        name=job.name,
        status=job.status,
        total_files=job.total_files,
        processed_files=job.processed_files,
        failed_files=job.failed_files,
        created_at=job.created_at.isoformat(),
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        status_message=job.status_message,
        error_message=job.error_message,
    )


@router.post("/upload-files", status_code=200)
async def upload_files(
    files: List[UploadFile],
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Upload PDF files to S3 so the Celery worker can access them."""
    import uuid, asyncio, boto3
    from app.core.config import settings

    if not settings.S3_BUCKET or not settings.AWS_ACCESS_KEY_ID:
        raise HTTPException(status_code=500, detail="S3 not configured. Set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in env.")

    sid = session_id or str(uuid.uuid4())
    prefix = f"uploads/{current_user.id}/{sid}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_DEFAULT_REGION,
    )

    import re, os

    # ── Phase 1: Read all files sequentially ────────────────────────────────
    # UploadFile.read() is NOT safe to call concurrently — two coroutines
    # sharing the same multipart stream can receive each other's bytes,
    # making both S3 objects contain the first file's content.
    # Reading is fast (bytes already in memory), so sequential is fine.
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    file_data: list = []  # list of (safe_name, content_bytes)
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            continue

        content = await file.read(max_bytes + 1)

        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
            )
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is not a valid PDF (magic bytes mismatch).",
            )

        safe_name = re.sub(r"[^\w\-. ]", "_", os.path.basename(file.filename))
        file_data.append((safe_name, content))

    # ── Phase 2: Upload to S3 concurrently ──────────────────────────────────
    # S3 puts are network-bound and safe to parallelize — each has its own
    # key and its own bytes object captured in the closure.
    import asyncio
    loop = asyncio.get_event_loop()

    async def s3_put(safe_name: str, data: bytes) -> str:
        key = f"{prefix}/{safe_name}"
        await loop.run_in_executor(None, lambda: s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=data,
            ContentType="application/pdf",
        ))
        return safe_name

    saved = list(await asyncio.gather(*[s3_put(n, d) for n, d in file_data]))
    # Return S3 path in format "bucket/prefix" for _collect_pdfs
    upload_path = f"{settings.S3_BUCKET}/{prefix}"
    return {"upload_path": upload_path, "storage_provider": "s3", "session_id": sid, "files": saved}
