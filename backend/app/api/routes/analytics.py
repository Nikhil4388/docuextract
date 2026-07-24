import hashlib
import json
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, update
from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_optional_user
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class TrackEventRequest(BaseModel):
    event_type: str                              # page_view | click | conversion
    page: Optional[str] = None
    element: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None


@router.post("/track", status_code=204)
async def track_event(
    payload: TrackEventRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lightweight event tracking.  Never fails — any exception is silently swallowed
    so tracking errors never break the user-facing flow.
    """
    try:
        ip = (request.client.host if request.client else "unknown")
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
        meta_json = json.dumps(payload.metadata) if payload.metadata else None

        await db.execute(
            text("""
                INSERT INTO analytics_events
                    (id, user_id, session_id, event_type, page, element, metadata, ip_hash, created_at)
                VALUES
                    (gen_random_uuid(),
                     :user_id::uuid,
                     :session_id,
                     :event_type,
                     :page,
                     :element,
                     :metadata::jsonb,
                     :ip_hash,
                     NOW())
            """),
            {
                "user_id": str(current_user.id) if current_user else None,
                "session_id": payload.session_id,
                "event_type": payload.event_type,
                "page": payload.page,
                "element": payload.element,
                "metadata": meta_json,
                "ip_hash": ip_hash,
            },
        )
        await db.commit()

        # Also update user's last_seen_at (at most once per session to avoid excess writes)
        if current_user:
            await db.execute(
                text("""
                    UPDATE users
                    SET last_seen_at = NOW()
                    WHERE id = :uid
                      AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '1 hour')
                """),
                {"uid": str(current_user.id)},
            )
            await db.commit()

    except Exception:
        # Never propagate — analytics must never break the app
        pass

    return Response(status_code=204)
