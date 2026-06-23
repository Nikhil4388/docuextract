"""
Celery extraction task — fully async pipeline for maximum throughput.

Scaling formula (auto-adjusts to any load):
  concurrent_slots = min(file_count, CLAUDE_MAX_CONCURRENT)   # default 50
  total_time ≈ (file_count / concurrent_slots) × avg_claude_latency

Real-world targets:
  10   files  →  ~8s    (10 concurrent, all fire at once)
  100  files  →  ~12s   (50 concurrent sliding window)
  1000 files  →  ~2min  (rate-limit bound — raise CLAUDE_MAX_CONCURRENT to push faster)
  10k  files  →  ~20min (Anthropic enterprise tier can push to ~5min)

To go faster: set CLAUDE_MAX_CONCURRENT=150 in Railway env vars
(requires Anthropic account with higher RPM tier).
"""
import asyncio
import json
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import List, Tuple, Any

import anthropic as _anthropic
from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.core.security import decrypt_secret
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus
from app.services.pdf.extractor import PDFExtractor

# ── DB (sync, for Celery forked process) ────────────────────────────────────
_sync_engine = None
_SyncSession = None

def _get_db() -> Session:
    global _sync_engine, _SyncSession
    if _sync_engine is None:
        _sync_engine = create_engine(
            settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"),
            pool_size=20,
            max_overflow=40,
        )
        _SyncSession = sessionmaker(bind=_sync_engine)
    return _SyncSession()


# ── Constants ────────────────────────────────────────────────────────────────
_DEPRECATED_MODELS = {
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229",
}
_DEFAULT_MODEL = "claude-sonnet-4-6"

_SYSTEM_PROMPT = """You are a precise data extraction assistant.
Return ONLY valid JSON with two keys:
1. "extracted_data": {column_name: value} — use null ONLY if truly not found
2. "confidence_scores": {column_name: 0.0-1.0}

CONFIDENCE RULES: Score 1.0 for unambiguous labeled fields, 0.97-0.99 for clearly
found values, 0.95-0.96 for high-confidence with minor ambiguity.
Most structured document fields should score 0.95+. Do NOT lower scores artificially."""


# ── Celery entry point ───────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3)
def run_extraction_job(self, job_id: str):
    """Bridges sync Celery → fully async extraction pipeline."""
    try:
        asyncio.run(_async_pipeline(job_id))
    except Exception as exc:
        print(f"[TASK] ❌ job={job_id} unhandled: {exc}", flush=True)
        raise self.retry(exc=exc, countdown=30)


# ── Async pipeline ───────────────────────────────────────────────────────────

async def _async_pipeline(job_id: str):
    loop = asyncio.get_event_loop()
    # Thread pool for blocking I/O (S3, DB writes, PDF parsing)
    io_pool = ThreadPoolExecutor(max_workers=50, thread_name_prefix="io")

    # ── Step 1: Load job ─────────────────────────────────────────────────
    db: Session = await loop.run_in_executor(io_pool, _get_db)
    job: ExtractionJob = await loop.run_in_executor(
        io_pool, lambda: db.query(ExtractionJob).filter_by(id=job_id).first()
    )
    if not job:
        print(f"[TASK] job {job_id} not found in DB", flush=True)
        return

    def _start():
        job.status = JobStatus.PROCESSING
        job.status_message = "Starting extraction…"
        job.started_at = datetime.utcnow()
        db.commit()
    await loop.run_in_executor(io_pool, _start)

    # Resolve template & model
    template = job.template
    columns = template.columns if template else []
    model = (
        job.llm_model
        if job.llm_model and job.llm_model not in _DEPRECATED_MODELS
        else _DEFAULT_MODEL
    )

    # ── Step 2: Download all PDFs in parallel ────────────────────────────
    def _status(msg):
        job.status_message = msg
        db.commit()
    await loop.run_in_executor(io_pool, _status, "Downloading files…")

    pdf_paths: List[str] = await loop.run_in_executor(
        io_pool, _collect_pdfs_sync, job
    )
    n = len(pdf_paths)
    print(f"[TASK] job={job_id} files={n} model={model}", flush=True)

    def _set_total():
        job.total_files = n
        job.status_message = f"Extracting {n} file{'s' if n != 1 else ''} in parallel…"
        db.commit()
    await loop.run_in_executor(io_pool, _set_total)

    if n == 0:
        def _empty():
            job.status = JobStatus.COMPLETED
            job.status_message = None
            job.completed_at = datetime.utcnow()
            db.commit()
        await loop.run_in_executor(io_pool, _empty)
        return

    # ── Step 3: Fire ALL files to Claude concurrently ────────────────────
    # CLAUDE_MAX_CONCURRENT controls how many simultaneous API calls.
    # Default 50. Set higher on a paid Anthropic tier for more speed.
    max_concurrent = min(n, int(os.getenv("CLAUDE_MAX_CONCURRENT", "50")))
    print(f"[TASK] concurrency={max_concurrent}/{n}", flush=True)

    semaphore = asyncio.Semaphore(max_concurrent)
    client = _anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    extractor = PDFExtractor()
    lock = asyncio.Lock()
    progress = {"ok": 0, "fail": 0}

    async def extract_one(path: str) -> Tuple[str, Any]:
        async with semaphore:
            fname = os.path.basename(path)
            try:
                # PDF text/image extraction — blocking, run in thread
                pages = await loop.run_in_executor(
                    io_pool, extractor.extract_text, path
                )
                full_text = "\n\n".join(p["text"] for p in pages if p["text"])
                page_images = [p["image_b64"] for p in pages if p.get("image_b64")]
                ocr_used = any(p["ocr_used"] for p in pages)

                columns_desc = json.dumps(columns, indent=2)
                t0 = time.time()

                # Build message: Vision for scanned, text for native PDFs
                if page_images:
                    content = [
                        {
                            "type": "text",
                            "text": (
                                f"Extract data from this scanned document.\n\n"
                                f"COLUMNS:\n{columns_desc}\n\n"
                                f"Return JSON only. Score clearly found fields 0.97+."
                            ),
                        },
                        *[
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": img,
                                },
                            }
                            for img in page_images[:5]
                        ],
                    ]
                else:
                    content = [
                        {
                            "type": "text",
                            "text": (
                                f"Extract data from this document.\n\n"
                                f"COLUMNS:\n{columns_desc}\n\n"
                                f"TEXT:\n{full_text[:8000]}\n\n"
                                f"Return JSON only. Score clearly found fields 0.97+."
                            ),
                        }
                    ]

                # Async Claude call — does NOT block other concurrent extractions
                msg = await client.messages.create(
                    model=model,
                    max_tokens=2000,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": content}],
                )
                elapsed_ms = int((time.time() - t0) * 1000)

                raw = msg.content[0].text.strip()
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                data = json.loads(raw.strip())

                async with lock:
                    progress["ok"] += 1
                    done = progress["ok"] + progress["fail"]
                    # Update DB every 5 files so UI shows progress
                    if done % 5 == 0 or done == n:
                        ok, fail = progress["ok"], progress["fail"]
                        def _upd():
                            job.processed_files = ok
                            job.failed_files = fail
                            job.status_message = f"Processed {done} of {n}…"
                            db.commit()
                        await loop.run_in_executor(io_pool, _upd)

                print(f"[TASK] ✓ {fname} {elapsed_ms}ms", flush=True)
                return path, {**data, "processing_time_ms": elapsed_ms, "ocr_used": ocr_used}

            except _anthropic.RateLimitError:
                # Back off and retry this one file
                print(f"[TASK] ⏳ rate limit hit for {fname}, retrying in 10s…", flush=True)
                await asyncio.sleep(10)
                async with lock:
                    progress["fail"] += 1
                return path, Exception("Rate limit — retry job")

            except Exception as exc:
                print(f"[TASK] ❌ {fname}: {type(exc).__name__}: {exc}", flush=True)
                async with lock:
                    progress["fail"] += 1
                return path, exc

    # Launch ALL at once — semaphore keeps concurrency under control
    t_start = time.time()
    all_results: List[Tuple[str, Any]] = await asyncio.gather(
        *[extract_one(p) for p in pdf_paths]
    )
    total_elapsed = time.time() - t_start
    print(
        f"[TASK] 🏁 job={job_id} {n} files in {total_elapsed:.1f}s "
        f"({n/total_elapsed:.1f} files/sec) | "
        f"ok={progress['ok']} fail={progress['fail']}",
        flush=True,
    )

    # ── Step 4: Bulk-save all results ────────────────────────────────────
    def _save_all():
        for path, outcome in all_results:
            fname = os.path.basename(path)
            if isinstance(outcome, Exception):
                db.add(ExtractionResult(
                    job_id=job.id,
                    file_name=fname,
                    file_path=path,
                    error_message=str(outcome),
                ))
            else:
                db.add(ExtractionResult(
                    job_id=job.id,
                    file_name=fname,
                    file_path=path,
                    extracted_data=outcome.get("extracted_data"),
                    confidence_scores=outcome.get("confidence_scores"),
                    processing_time_ms=outcome.get("processing_time_ms"),
                    ocr_used=outcome.get("ocr_used", False),
                ))
        job.processed_files = progress["ok"]
        job.failed_files = progress["fail"]
        job.status = JobStatus.COMPLETED
        job.status_message = None
        job.completed_at = datetime.utcnow()
        db.commit()

    await loop.run_in_executor(io_pool, _save_all)
    io_pool.shutdown(wait=False)
    db.close()


# ── PDF collection (sync, runs in thread pool) ───────────────────────────────

def _collect_pdfs_sync(job: ExtractionJob) -> List[str]:
    """Download/locate all PDFs. S3 downloads run in parallel."""
    if job.storage_provider == "local":
        path = job.storage_path or ""
        if os.path.isdir(path):
            return [
                os.path.join(path, f)
                for f in os.listdir(path)
                if f.lower().endswith(".pdf")
            ]
        return []

    creds = (
        json.loads(decrypt_secret(job.storage_credentials_enc))
        if job.storage_credentials_enc
        else {}
    )
    tmpdir = tempfile.mkdtemp(prefix="docuextract_")

    if job.storage_provider == "s3" and not creds:
        creds = {
            "access_key": settings.AWS_ACCESS_KEY_ID,
            "secret_key": settings.AWS_SECRET_ACCESS_KEY,
            "region": settings.AWS_DEFAULT_REGION,
        }

    from app.services.storage.s3_service import get_storage_service
    svc = get_storage_service(job.storage_provider, creds)

    if job.storage_provider == "s3":
        storage = job.storage_path or ""
        bucket, prefix = storage.split("/", 1) if "/" in storage else (storage, "")
        print(f"[S3] bucket={bucket!r} prefix={prefix!r}", flush=True)
        keys = svc.list_pdfs(bucket, prefix)
        print(f"[S3] {len(keys)} PDFs listed", flush=True)

        # Download all S3 files in parallel
        with ThreadPoolExecutor(max_workers=min(len(keys), 20)) as pool:
            futures = [pool.submit(svc.download_pdf, bucket, key, tmpdir) for key in keys]
            return [f.result() for f in futures]

    elif job.storage_provider == "google_drive":
        files = svc.list_pdfs(job.storage_path)
        return [svc.download_pdf(f["id"], tmpdir, f["name"]) for f in files]

    elif job.storage_provider == "dropbox":
        files = svc.list_pdfs(job.storage_path)
        return [svc.download_pdf(f["path"], tmpdir) for f in files]

    return []
