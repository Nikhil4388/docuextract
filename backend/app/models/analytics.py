from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.core.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)   # No FK — no cascade on user delete
    session_id = Column(String(128), nullable=True)
    event_type = Column(String(64), nullable=False)        # page_view | click | conversion
    page = Column(String(255), nullable=True)
    element = Column(String(255), nullable=True)
    metadata = Column(JSON, nullable=True)
    ip_hash = Column(String(16), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
