import ssl
from celery import Celery
from app.core.config import settings

# Strip any ?ssl_cert_reqs=... query params — we configure SSL properly below
def _clean_redis_url(url: str) -> str:
    return url.split("?")[0] if url else url

broker_url = _clean_redis_url(settings.CELERY_BROKER_URL)
backend_url = _clean_redis_url(settings.CELERY_RESULT_BACKEND)

celery_app = Celery(
    "docuextract",
    broker=broker_url,
    backend=backend_url,
    include=["app.tasks.extraction_task"],
)

# Use proper SSL config for rediss:// (Upstash)
_ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE} if broker_url.startswith("rediss://") else {}

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.extraction_task.run_extraction_job": {"queue": "extraction"},
    },
    broker_use_ssl=_ssl_opts or None,
    redis_backend_use_ssl=_ssl_opts or None,
)
