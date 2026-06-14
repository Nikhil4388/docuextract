from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import structlog
import time

from app.core.config import settings
from app.api.routes import auth, users, templates, jobs

logger = structlog.get_logger()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        # Allow large uploads (500MB)
        max_upload_size=500 * 1024 * 1024,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000, 2)
        logger.info(
            "request",
            method=request.method,
            url=str(request.url),
            status=response.status_code,
            duration_ms=elapsed,
        )
        return response

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(templates.router, prefix=prefix)
    app.include_router(jobs.router, prefix=prefix)

    # ── Startup: reset stuck jobs from previous restarts ──────────────────────
    @app.on_event("startup")
    async def reset_stuck_jobs():
        from app.core.database import AsyncSessionLocal
        from app.models.extraction import ExtractionJob, JobStatus
        from sqlalchemy import select, update
        async with AsyncSessionLocal() as db:
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

    # ── Exception Handlers ────────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_exception", error=str(exc), path=request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
