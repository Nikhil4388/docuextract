from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from app.core.database import Base


class AuthProvider(str, enum.Enum):
    EMAIL = "email"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    APPLE = "apple"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.USER, nullable=False)
    auth_provider = Column(SAEnum(AuthProvider, values_callable=lambda x: [e.value for e in x]), default=AuthProvider.EMAIL)
    oauth_id = Column(String(255), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Encrypted API keys
    anthropic_api_key_enc = Column(Text, nullable=True)
    openai_api_key_enc = Column(Text, nullable=True)

    # Subscription / billing
    jobs_used = Column(Integer, default=0, nullable=False, server_default="0")
    max_jobs_override = Column(Integer, nullable=True)  # Admin-set custom limit; None = use defaults
    is_subscribed = Column(Boolean, default=False, nullable=False, server_default="false")
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)

    # Activity tracking
    last_seen_at = Column(DateTime, nullable=True)

    extraction_jobs = relationship("ExtractionJob", back_populates="user", cascade="all, delete-orphan")
    column_templates = relationship("ColumnTemplate", back_populates="user", cascade="all, delete-orphan")
