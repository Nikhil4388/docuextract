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
# Models that are EOL and must not be sent to the API.
_DEPRECATED_MODELS = {
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-7-sonnet-20250219",
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-6",
}

# All models the UI exposes. Any model not in this set falls back to default.
_ALLOWED_MODELS = {
    "claude-haiku-4-5-20251001",   # Fastest
    "claude-sonnet-4-6",           # Balanced (default)
    "claude-sonnet-5",             # New / smarter
    "claude-opus-4-6",             # Quality
    "claude-opus-4-8",             # Premium
    "claude-fable-5",              # Most powerful
}

_DEFAULT_MODEL = "claude-sonnet-4-6"

_SYSTEM_PROMPT = """You are an expert data extraction specialist for historical legal and financial documents (1880s–1940s).

These documents often have OCR scanning artifacts — READ THROUGH THEM:
• "l9l9", "l9l8", "l92O" etc. = 1919, 1918, 1920 (lowercase L mistaken for digit 1, O for 0)
• "¬" at line end = hyphenation artifact, ignore it and join the word across lines
• Garbled uppercase runs (e.g. "AgrPPttttfttt") = OCR error for "Agreement" etc. — use context
• "$5O,OOO,OOO" → $50,000,000 (O vs 0 confusion)
• Split numbers across lines should be read as one value

EXTRACTION RULES:
1. Return ONLY valid JSON: {"extracted_data": {...}, "confidence_scores": {...}}
2. For fields with multiple values (serial maturity dates, multiple parties), join with " / "
3. If a value has OCR noise but is CLEARLY inferable from context, extract it — score 0.85-0.94
4. Use null ONLY if the field is genuinely absent from the entire document
5. Score 0.97-1.0 for clean unambiguous values; 0.85-0.96 for OCR-inferred but confident values
6. NEVER return null for a field you can reasonably infer from surrounding context

Most fields in structured legal documents (trust indentures, bond agreements, contracts)
ARE present — search the full text before returning null."""


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
    _requested = snap.get("llm_model") or ""
    if _requested in _ALLOWED_MODELS:
        model = _requested
    elif _requested and _requested not in _DEPRECATED_MODELS:
        # Unknown model string — try it anyway (forward-compat with future releases)
        model = _requested
        print(f"[TASK] ⚠️  Unknown model '{_requested}' — forwarding to API anyway", flush=True)
    else:
        model = _DEFAULT_MODEL
        if _requested:
            print(f"[TASK] ⚠️  Deprecated/invalid model '{_requested}' — falling back to {_DEFAULT_MODEL}", flush=True)
    print(f"[TASK] 🤖 Model selected: {model} (requested: {_requested or 'none'})", flush=True)

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
    billing_error: List[str] = []   # set to non-empty if we hit a billing wall

    async def extract_one(path: str) -> Tuple[str, Any]:
        async with semaphore:
            fname = os.path.basename(path)

            # If billing is exhausted there's no point calling the API again
            if billing_error:
                async with lock:
                    progress["fail"] += 1
                return path, Exception(billing_error[0])

            try:
                # Create a fresh PDFExtractor per file — avoids any PyMuPDF
                # shared-state issues when multiple threads open documents
                # concurrently inside the thread pool.
                _extractor = PDFExtractor()
                pages = await loop.run_in_executor(
                    io_pool, _extractor.extract_text, path
                )
                full_text = "\n\n".join(p["text"] for p in pages if p["text"])
                # Only treat as scanned if text is truly sparse — PDFs with blank
                # trailing pages produce a few image slots but have abundant OCR text.
                # Sending those blank images while ignoring 90KB of good text = all nulls.
                page_images = [p["image_b64"] for p in pages if p.get("image_b64")]
                ocr_used = any(p["ocr_used"] for p in pages)
                use_vision = bool(page_images) and len(full_text.strip()) < 500

                print(
                    f"[TASK] 📄 {fname}: {len(pages)} pages, "
                    f"{len(full_text)} text chars, {len(page_images)} image pages, "
                    f"mode={'VISION' if use_vision else 'TEXT'} | "
                    f"text_preview={full_text[:120]!r}",
                    flush=True,
                )

                columns_desc = json.dumps(columns, indent=2)
                t0 = time.time()

                def _build_vision_content(cols_desc: str, imgs: list) -> list:
                    return [
                        {"type": "text", "text": (
                            f"Extract data from this scanned historical document.\n\n"
                            f"COLUMNS:\n{cols_desc}\n\n"
                            f"Return JSON only with 'extracted_data' and 'confidence_scores'."
                        )},
                        *[{"type": "image", "source": {
                            "type": "base64", "media_type": "image/png", "data": img,
                        }} for img in imgs[:10]],
                    ]

                def _build_text_content(cols_desc: str, txt: str) -> list:
                    return [{"type": "text", "text": (
                        f"Extract data from this historical legal document "
                        f"(OCR text — treat 'l9l9'=1919, '¬'=hyphen, garbled words as OCR errors).\n\n"
                        f"COLUMNS:\n{cols_desc}\n\n"
                        f"TEXT:\n{txt[:20000]}\n\n"
                        f"Return JSON with 'extracted_data' and 'confidence_scores' only."
                    )}]

                def _parse_llm_raw(raw: str) -> dict:
                    raw = raw.strip()
                    if raw.startswith("```"):
                        raw = raw.split("```")[1]
                        if raw.startswith("json"):
                            raw = raw[4:]
                    return json.loads(raw.strip())

                async def _call_llm(content: list) -> dict:
                    m = await client.messages.create(
                        model=model,
                        max_tokens=4096,
                        system=_SYSTEM_PROMPT,
                        messages=[{"role": "user", "content": content}],
                    )
                    return _parse_llm_raw(m.content[0].text)

                if use_vision:
                    content = _build_vision_content(columns_desc, page_images)
                else:
                    content = _build_text_content(columns_desc, full_text)

                data = await _call_llm(content)

                # ── Vision fallback (pre-existing page images) ───────────────
                # If text path returned mostly nulls (garbled OCR) and we have
                # page images from below-threshold pages, retry with Vision.
                if not use_vision and page_images:
                    extracted = data.get("extracted_data") or {}
                    null_count = sum(1 for v in extracted.values() if v is None)
                    if null_count > len(columns) * 0.6:
                        print(
                            f"[TASK] ⚠️  {fname}: text gave {null_count}/{len(columns)} nulls "
                            f"— retrying with Vision (pre-rendered pages)",
                            flush=True,
                        )
                        vision_data = await _call_llm(
                            _build_vision_content(columns_desc, page_images)
                        )
                        v_extracted = vision_data.get("extracted_data") or {}
                        v_null = sum(1 for v in v_extracted.values() if v is None)
                        if v_null < null_count:
                            data = vision_data
                            print(f"[TASK] ✅ {fname}: Vision improved nulls {null_count}→{v_null}", flush=True)

                # ── Render-on-demand Vision fallback ─────────────────────────
                # If ALL pages had OCR text (page_images is empty) but extraction
                # still returns mostly nulls, the OCR quality is too poor to parse.
                # Render first 10 pages as PNG images on-demand and retry with Vision.
                if not use_vision and not page_images:
                    extracted = data.get("extracted_data") or {}
                    null_count = sum(1 for v in extracted.values() if v is None)
                    if null_count > len(columns) * 0.6:
                        print(
                            f"[TASK] 🖼️  {fname}: text gave {null_count}/{len(columns)} nulls "
                            f"and no pre-rendered images — rendering pages on-demand for Vision",
                            flush=True,
                        )

                        def _render_pages(pdf_path: str, num_pages: int = 10) -> list:
                            import fitz as _fitz, base64 as _b64
                            _doc = _fitz.open(pdf_path)
                            _images = []
                            _mat = _fitz.Matrix(2, 2)
                            for _i, _page in enumerate(_doc):
                                if _i >= num_pages:
                                    break
                                _pix = _page.get_pixmap(matrix=_mat)
                                _images.append(_b64.b64encode(_pix.tobytes("png")).decode("utf-8"))
                            _doc.close()
                            return _images

                        rendered = await loop.run_in_executor(io_pool, _render_pages, path)
                        print(f"[TASK] 🖼️  {fname}: rendered {len(rendered)} pages", flush=True)
                        vision_data = await _call_llm(_build_vision_content(columns_desc, rendered))
                        v_extracted = vision_data.get("extracted_data") or {}
                        v_null = sum(1 for v in v_extracted.values() if v is None)
                        if v_null < null_count:
                            data = vision_data
                            print(f"[TASK] ✅ {fname}: on-demand Vision improved nulls {null_count}→{v_null}", flush=True)
                        else:
                            print(f"[TASK] ⚠️  {fname}: Vision didn't improve ({v_null} vs {null_count} nulls), keeping text result", flush=True)

                elapsed_ms = int((time.time() - t0) * 1000)

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

            except _anthropic.BadRequestError as exc:
                msg_text = str(exc)
                if "credit balance is too low" in msg_text or "billing" in msg_text.lower():
                    err = "Anthropic API credit balance is too low. Please top up at console.anthropic.com → Billing."
                    print(f"[TASK] 💳 billing error: {err}", flush=True)
                    async with lock:
                        if not billing_error:
                            billing_error.append(err)
                        progress["fail"] += 1
                    return path, Exception(err)
                print(f"[TASK] ❌ {fname}: {type(exc).__name__}: {exc}", flush=True)
                async with lock:
                    progress["fail"] += 1
                return path, exc

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
    import uuid as _uuid_mod
    _job_uuid_obj = _uuid_mod.UUID(job_uuid)  # ensure real UUID type for PG columns

    def _save_all(db):
        # Delete any existing results first — idempotent on Celery retries
        db.query(ExtractionResult).filter_by(job_id=_job_uuid_obj).delete()
        for path, outcome in all_results:
            fname = os.path.basename(path)
            if isinstance(outcome, Exception):
                db.add(ExtractionResult(
                    job_id=_job_uuid_obj,
                    file_name=fname,
                    file_path=path,
                    error_message=str(outcome),
                ))
            else:
                db.add(ExtractionResult(
                    job_id=_job_uuid_obj,
                    file_name=fname,
                    file_path=path,
                    extracted_data=outcome.get("extracted_data"),
                    confidence_scores=outcome.get("confidence_scores"),
                    processing_time_ms=outcome.get("processing_time_ms"),
                    ocr_used=outcome.get("ocr_used", False),
                ))
        print(f"[TASK] 💾 saving {len(all_results)} result rows for job {job_uuid}", flush=True)
        j = db.query(ExtractionJob).filter_by(id=_job_uuid_obj).first()
        if j:
            j.processed_files = progress["ok"]
            j.failed_files = progress["fail"]
            j.status = JobStatus.COMPLETED
            j.completed_at = datetime.utcnow()
            # Surface billing / fatal errors on the job itself so the UI can show them
            if billing_error:
                j.status_message = billing_error[0]
            else:
                j.status_message = None

    await loop.run_in_executor(io_pool, lambda: _run_db(_save_all))

    try:
        await client.close()
    except Exception:
        pass
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
