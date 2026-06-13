import ssl
from celery import Celery
from app.core.config import settings

# Strip any ?ssl_cert_reqs=... query params — we configure SSL via broker_use_ssl
def _clean_redis_url(url: str) -> str:
    return url.split("?")[0] if url else url

broker_url = _clean_redis_url(settings.CELERY_BROKER_URL)

# Results are tracked in PostgreSQL (ExtractionJob model) — no result backend needed.
# This means Redis is used ONLY as a broker: it stores tiny task messages for a few
# seconds until a worker picks them up, then deletes them. Storage used ≈ 0.
celery_app = Celery(
    "docuextract",
    broker=broker_url,
    backend=None,  # results tracked in our own DB, not Redis
    include=["app.tasks.extraction_task"],
)

# SSL config for rediss:// URLs (Redis Cloud TLS, Upstash, etc.)
_ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE} if broker_url.startswith("rediss://") else {}

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_ignore_result=True,      # don't store results in Redis at all
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.extraction_task.run_extraction_job": {"queue": "extraction"},
    },
    broker_use_ssl=_ssl_opts or None,
)
