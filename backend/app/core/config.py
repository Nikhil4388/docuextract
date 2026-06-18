from pydantic_settings import BaseSettings
from typing import Optional, List
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MultiPDFToExcel"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/docuextract"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://docuextract.app", "https://docuextract-ashen.vercel.app"]

    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    APPLE_CLIENT_ID: Optional[str] = None
    APPLE_PRIVATE_KEY: Optional[str] = None

    # Default LLM (Claude)
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # Storage
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    S3_BUCKET: Optional[str] = None

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "/tmp/docuextract/uploads"

    # Celery — only broker needed; results are tracked in PostgreSQL
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: Optional[str] = None  # not used; keep for env var compat

    # PayPal
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_PLAN_ID: Optional[str] = None           # Billing plan ID from PayPal dashboard
    PAYPAL_MODE: str = "sandbox"                    # "sandbox" for testing, "live" for production
    FREE_JOB_LIMIT: int = 2                         # Free jobs before paywall
    PAID_JOB_LIMIT: int = 20                        # Jobs unlocked after $10 donation
    KOFI_WEBHOOK_TOKEN: Optional[str] = None        # From Ko-fi Settings → API
    ADMIN_EMAILS: List[str] = []                    # Emails with unlimited jobs (testing)

    # Encryption (for API keys at rest)
    ENCRYPTION_KEY: str = secrets.token_urlsafe(32)

    # Email
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

    # Session
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5  # 5 min inactivity timeout

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
