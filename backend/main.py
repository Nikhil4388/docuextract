from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog
import time

from app.core.config import settings
from app.api.routes import auth, users, templates, jobs, payments
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware

logger = structlog.get_logger()


def create_app() -> FastAPI:
    # Disable Swagger / ReDoc in production (they expose your entire API surface)
    docs_url    = "/api/docs"    if settings.DEBUG else None
    redoc_url   = "/api/redoc"   if settings.DEBUG else None
    openapi_url = "/api/openapi.json" if settings.DEBUG else None

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        max_upload_size=500 * 1024 * 1024,
    )

    # ── Middleware (order matters — outermost first) ───────────────────────────

    # 1. Security headers — add OWASP headers to every response
    app.add_middleware(SecurityHeadersMiddleware)

    # 2. Rate limiting — per-IP sliding window (auth routes are stricter)
    app.add_middleware(RateLimitMiddleware)

    # 3. CORS — explicit allowlist only; no wildcard methods/headers
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
        max_age=600,
    )

    # 4. GZip compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 5. Request logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000, 2)
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,   # log path only, not full URL (avoids logging tokens in QS)
            status=response.status_code,
            duration_ms=elapsed,
        )
        return response

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router,      prefix=prefix)
    app.include_router(users.router,     prefix=prefix)
    app.include_router(templates.router, prefix=prefix)
    app.include_router(jobs.router,      prefix=prefix)
    app.include_router(payments.router,  prefix=prefix)

    # ── Startup ───────────────────────────────────────────────────────────────
    @app.on_event("startup")
    async def startup_tasks():
        from app.core.database import AsyncSessionLocal
        from app.models.extraction import ExtractionJob, JobStatus
        from sqlalchemy import text, update
        async with AsyncSessionLocal() as db:
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS jobs_used INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN NOT NULL DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP",
            ]
            for sql in migrations:
                try:
                    await db.execute(text(sql))
                except Exception as e:
                    logger.warning("startup_migration_skipped", sql=sql, error=str(e))
            await db.commit()

            # Reset stuck processing jobs
            await db.execute(
                update(ExtractionJob)
                .where(ExtractionJob.status == JobStatus.PROCESSING)
                .values(
                    status=JobStatus.FAILED,
                    error_message="Server restarted while job was running. Please resubmit.",
                    status_message=None,
                )
            )
            await db.commit()

    # ── Health ────────────────────────────────────────────────────────────────
    @app.get("/health")
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    # ── Global error handler — never leak stack traces ────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Log internally but return a generic message to the caller
        logger.error("unhandled_exception", path=request.url.path, exc_type=type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
