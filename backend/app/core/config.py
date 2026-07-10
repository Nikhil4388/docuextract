from pydantic_settings import BaseSettings
from typing import Optional, List
import secrets


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "MultiPDFToExcel"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ── Security ─────────────────────────────────────────────────────────────
    # MUST be set via env var in production — never use the default
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_openssl_rand_hex_32"
    ENCRYPTION_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_openssl_rand_hex_32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24   # 24 h (fixed — was duplicated/overwritten)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12                        # Work factor for password hashing

    # ── Rate limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10          # login / register attempts
    RATE_LIMIT_API_PER_MINUTE: int = 120          # general API calls per user

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/docuextract"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://docuextract.app",
        "https://docuextract-ashen.vercel.app",
        "https://multipdfstoexcel.com",
        "https://www.multipdfstoexcel.com",
    ]

    # ── OAuth ────────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # ── LLM ──────────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # ── Storage ──────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    S3_BUCKET: Optional[str] = None

    # ── File upload ──────────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "/tmp/docuextract/uploads"

    # ── Celery ───────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: Optional[str] = None

    # ── Payments ─────────────────────────────────────────────────────────────
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_PLAN_ID: Optional[str] = None
    PAYPAL_MODE: str = "sandbox"
    FREE_JOB_LIMIT: int = 2
    PAID_JOB_LIMIT: int = 20
    KOFI_WEBHOOK_TOKEN: Optional[str] = None
    ADMIN_EMAILS: str = ""

    @property
    def admin_email_list(self) -> List[str]:
        return [e.strip() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    # ── Email ────────────────────────────────────────────────────────────────
    RESEND_API_KEY: Optional[str] = None
    GMAIL_USER: Optional[str] = None
    GMAIL_APP_PASSWORD: Optional[str] = None
    BREVO_API_KEY: Optional[str] = None
    BREVO_SENDER_EMAIL: Optional[str] = None
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
