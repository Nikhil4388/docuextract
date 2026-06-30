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
from app.models.user import User  # noqa: F401 — must import before extraction models so SQLAlchemy mapper resolves 'User' relationships
from app.models.extraction import ExtractionJob, ExtractionResult, JobStatus
from app.services.pdf.extractor import PDFExtractor

# ── DB (sync, for Celery forked process) ────────────────────────────────────
_sync_engine = None
_SyncSession = None

def _get_engine():
    global _sync_engine, _SyncSession
    if _sync_engine is None:
        _sync_engine = create_engine(
            settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"),
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,      # check connection health before each use
            pool_recycle=300,        # recycle connections every 5 min
            connect_args={"connect_timeout": 10},
        )
        _SyncSession = sessionmaker(bind=_sync_engine)
    return _SyncSession

def _get_db() -> Session:
    return _get_engine()()

def _run_db(fn, retries: int = 3):
    """Execute fn(db) in a fresh session; commit on success, retry on connection errors."""
    import psycopg2
    from sqlalchemy.exc import OperationalError, PendingRollbackError
    last_exc = None
    for attempt in range(retries):
        db = _get_db()
        try:
            result = fn(db)
            db.commit()
            db.close()
            return result
        except (OperationalError, PendingRollbackError, psycopg2.OperationalError) as exc:
            last_exc = exc
            try:
                db.rollback()
            except Exception:
                pass
            try:
                db.close()
            except Exception:
                pass
            if attempt < retries - 1:
                import time as _time
                _time.sleep(2 ** attempt)  # 1s, 2s, …
        except Exception:
            try:
                db.rollback()
                db.close()
            except Exception:
                pass
            raise
    raise last_exc


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

    # ── Step 1: Load job — snapshot ALL fields to plain Python values ────
    # IMPORTANT: never use an ORM object after its session closes.
    # _run_db closes the session on exit, so we must copy everything we need
    # into primitives / dicts while the session is still open.
    def _load_job_snapshot(db):
        job = db.query(ExtractionJob).filter_by(id=job_id).first()
        if not job:
            return None
        tmpl = job.template  # trigger lazy-load while session is open
        return {
            "id": str(job.id),
            "storage_provider": job.storage_provider,
            "storage_path": job.storage_path,
            "storage_credentials_enc": job.storage_credentials_enc,
            "llm_model": job.llm_model,
            "columns": (tmpl.columns if tmpl else []),
        }

    snap = await loop.run_in_executor(io_pool, lambda: _run_db(_load_job_snapshot))
    if not snap:
        print(f"[TASK] job {job_id} not found in DB", flush=True)
        return

    job_uuid = snap["id"]
    columns = snap["columns"]
    model = (
        snap["llm_model"]
        if snap["llm_model"] and snap["llm_model"] not in _DEPRECATED_MODELS
        else _DEFAULT_MODEL
    )

    def _update_job(**kwargs):
        """Apply field updates to the job in a fresh session."""
        def _fn(db):
            j = db.query(ExtractionJob).filter_by(id=job_uuid).first()
            if j:
                for k, v in kwargs.items():
                    setattr(j, k, v)
        _run_db(_fn)

    await loop.run_in_executor(io_pool, lambda: _update_job(
        status=JobStatus.PROCESSING,
        status_message="Starting extraction…",
        started_at=datetime.utcnow(),
    ))

    # ── Step 2: Download all PDFs in parallel ────────────────────────────
    await loop.run_in_executor(io_pool, lambda: _update_job(status_message="Downloading files…"))

    # Pass the plain snapshot dict — no ORM objects cross the session boundary
    pdf_paths: List[str] = await loop.run_in_executor(
        io_pool, _collect_pdfs_sync, snap
    )
    n = len(pdf_paths)
    print(f"[TASK] job={job_id} files={n} model={model}", flush=True)

    await loop.run_in_executor(io_pool, lambda: _update_job(
        total_files=n,
        status_message=f"Extracting {n} file{'s' if n != 1 else ''} in parallel…",
    ))

    if n == 0:
        await loop.run_in_executor(io_pool, lambda: _update_job(
            status=JobStatus.COMPLETED,
            status_message=None,
            completed_at=datetime.utcnow(),
        ))
        return

    # ── Step 3: Fire ALL files to Claude concurrently ────────────────────
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
                pages = await loop.run_in_executor(
                    io_pool, extractor.extract_text, path
                )
                full_text = "\n\n".join(p["text"] for p in pages if p["text"])
                page_images = [p["image_b64"] for p in pages if p.get("image_b64")]
                ocr_used = any(p["ocr_used"] for p in pages)

                columns_desc = json.dumps(columns, indent=2)
                t0 = time.time()

                if page_images:
                    content = [
                        {"type": "text", "text": (
                            f"Extract data from this scanned document.\n\n"
                            f"COLUMNS:\n{columns_desc}\n\n"
                            f"Return JSON only. Score clearly found fields 0.97+."
                        )},
                        *[{"type": "image", "source": {
                            "type": "base64", "media_type": "image/png", "data": img,
                        }} for img in page_images[:5]],
                    ]
                else:
                    content = [{"type": "text", "text": (
                        f"Extract data from this document.\n\n"
                        f"COLUMNS:\n{columns_desc}\n\n"
                        f"TEXT:\n{full_text[:8000]}\n\n"
                        f"Return JSON only. Score clearly found fields 0.97+."
                    )}]

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
                    if done % 5 == 0 or done == n:
                        ok, fail, msg_txt = progress["ok"], progress["fail"], f"Processed {done} of {n}…"
                        await loop.run_in_executor(io_pool, lambda: _update_job(
                            processed_files=ok, failed_files=fail, status_message=msg_txt
                        ))

                print(f"[TASK] ✓ {fname} {elapsed_ms}ms", flush=True)
                return path, {**data, "processing_time_ms": elapsed_ms, "ocr_used": ocr_used}

            except _anthropic.RateLimitError:
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
    def _save_all(db):
        for path, outcome in all_results:
            fname = os.path.basename(path)
            if isinstance(outcome, Exception):
                db.add(ExtractionResult(
                    job_id=job_uuid,
                    file_name=fname,
                    file_path=path,
                    error_message=str(outcome),
                ))
            else:
                db.add(ExtractionResult(
                    job_id=job_uuid,
                    file_name=fname,
                    file_path=path,
                    extracted_data=outcome.get("extracted_data"),
                    confidence_scores=outcome.get("confidence_scores"),
                    processing_time_ms=outcome.get("processing_time_ms"),
                    ocr_used=outcome.get("ocr_used", False),
                ))
        j = db.query(ExtractionJob).filter_by(id=job_uuid).first()
        if j:
            j.processed_files = progress["ok"]
            j.failed_files = progress["fail"]
            j.status = JobStatus.COMPLETED
            j.status_message = None
            j.completed_at = datetime.utcnow()

    await loop.run_in_executor(io_pool, lambda: _run_db(_save_all))

    await client.aclose()
    io_pool.shutdown(wait=False)


# ── PDF collection (sync, runs in thread pool) ───────────────────────────────

def _collect_pdfs_sync(snap: dict) -> List[str]:
    """Download/locate all PDFs. Accepts a plain dict snapshot (no ORM objects)."""
    provider = snap["storage_provider"]
    path = snap["storage_path"] or ""
    creds_enc = snap["storage_credentials_enc"]

    if provider == "local":
        if os.path.isdir(path):
            return [
                os.path.join(path, f)
                for f in os.listdir(path)
                if f.lower().endswith(".pdf")
            ]
        return []

    creds = json.loads(decrypt_secret(creds_enc)) if creds_enc else {}
    tmpdir = tempfile.mkdtemp(prefix="docuextract_")

    if provider == "s3" and not creds:
        creds = {
            "access_key": settings.AWS_ACCESS_KEY_ID,
            "secret_key": settings.AWS_SECRET_ACCESS_KEY,
            "region": settings.AWS_DEFAULT_REGION,
        }

    from app.services.storage.s3_service import get_storage_service
    svc = get_storage_service(provider, creds)

    if provider == "s3":
        bucket, prefix = path.split("/", 1) if "/" in path else (path, "")
        print(f"[S3] bucket={bucket!r} prefix={prefix!r}", flush=True)
        keys = svc.list_pdfs(bucket, prefix)
        print(f"[S3] {len(keys)} PDFs listed", flush=True)
        with ThreadPoolExecutor(max_workers=min(len(keys), 20)) as pool:
            futures = [pool.submit(svc.download_pdf, bucket, key, tmpdir) for key in keys]
            return [f.result() for f in futures]

    elif provider == "google_drive":
        files = svc.list_pdfs(path)
        return [svc.download_pdf(f["id"], tmpdir, f["name"]) for f in files]

    elif provider == "dropbox":
        files = svc.list_pdfs(path)
        return [svc.download_pdf(f["path"], tmpdir) for f in files]

    return []
