from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from app.core.database import Base


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StorageProvider(str, enum.Enum):
    LOCAL = "local"
    S3 = "s3"
    GOOGLE_DRIVE = "google_drive"
    DROPBOX = "dropbox"


class LLMProvider(str, enum.Enum):
    CLAUDE = "claude"
    OPENAI = "openai"


class ColumnTemplate(Base):
    __tablename__ = "column_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    columns = Column(JSON, nullable=False)  # List of {name, description, data_type, extraction_hint}
    sample_pdf_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="column_templates")
    extraction_jobs = relationship("ExtractionJob", back_populates="template")


class ExtractionJob(Base):
    __tablename__ = "extraction_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("column_templates.id"), nullable=True)
    name = Column(String(255), nullable=False)
    status = Column(SAEnum(JobStatus, values_callable=lambda x: [e.value for e in x]), default=JobStatus.PENDING)
    storage_provider = Column(SAEnum(StorageProvider, values_callable=lambda x: [e.value for e in x]), default=StorageProvider.LOCAL)
    storage_path = Column(Text, nullable=True)
    storage_credentials_enc = Column(Text, nullable=True)
    llm_provider = Column(SAEnum(LLMProvider, values_callable=lambda x: [e.value for e in x]), default=LLMProvider.CLAUDE)
    llm_model = Column(String(100), nullable=True)
    use_user_api_key = Column(Boolean, default=False)
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    celery_task_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="extraction_jobs")
    template = relationship("ColumnTemplate", back_populates="extraction_jobs")
    results = relationship("ExtractionResult", back_populates="job", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="job", cascade="all, delete-orphan")


class ExtractionResult(Base):
    __tablename__ = "extraction_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("extraction_jobs.id"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)
    page_count = Column(Integer, nullable=True)
    extracted_data = Column(JSON, nullable=True)   # {column_name: value, ...}
    confidence_scores = Column(JSON, nullable=True)  # {column_name: 0.0-1.0, ...}
    ocr_used = Column(Boolean, default=False)
    processing_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ExtractionJob", back_populates="results")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("extraction_jobs.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    metadata_obj = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ExtractionJob", back_populates="audit_logs")
