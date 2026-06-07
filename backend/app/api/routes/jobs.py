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
from app.models.user import User
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus, StorageProvider, LLMProvider
from app.api.deps import get_current_user
from app.services.extraction_service import ExtractionService

router = APIRouter(prefix="/jobs", tags=["Extraction Jobs"])


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
    await db.flush()

    # Dispatch Celery task
    from app.tasks.extraction_task import run_extraction_job
    task = run_extraction_job.delay(str(job.id))
    job.celery_task_id = task.id

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
        error_message=job.error_message,
    )


@router.post("/upload-files", status_code=200)
async def upload_files(
    files: List[UploadFile],
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Upload PDF files in batches. Use session_id to combine batches into one folder."""
    import os, uuid, aiofiles, asyncio
    sid = session_id or str(uuid.uuid4())
    upload_dir = f"/tmp/docuextract/uploads/{current_user.id}/{sid}"
    os.makedirs(upload_dir, exist_ok=True)

    async def save_file(file: UploadFile):
        if not file.filename.lower().endswith('.pdf'):
            return None
        dest = os.path.join(upload_dir, file.filename)
        content = await file.read()
        async with aiofiles.open(dest, 'wb') as f:
            await f.write(content)
        return file.filename

    # Save all files in parallel
    results = await asyncio.gather(*[save_file(f) for f in files])
    saved = [r for r in results if r]
    return {"upload_path": upload_dir, "session_id": sid, "files": saved}
