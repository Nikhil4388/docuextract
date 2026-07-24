from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, update
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.extraction import ExtractionJob, JobStatus
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Auth guard ────────────────────────────────────────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow if email is in ADMIN_EMAILS env var OR if DB role is ADMIN."""
    if (
        current_user.email not in settings.admin_email_list
        and current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserAdminView(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    is_subscribed: bool
    jobs_used: int
    max_jobs_override: Optional[int]
    effective_limit: int
    total_jobs: int
    last_seen_at: Optional[str]
    created_at: str
    auth_provider: Optional[str]

    class Config:
        from_attributes = True


class DayStats(BaseModel):
    date: str
    jobs: int


class AdminOverview(BaseModel):
    total_users: int
    active_users_today: int
    total_jobs: int
    jobs_today: int
    subscribed_users: int
    completed_jobs: int
    failed_jobs: int
    jobs_last_7_days: List[DayStats]


class AdjustCreditsRequest(BaseModel):
    jobs_used: Optional[int] = None           # Override the used counter
    max_jobs_override: Optional[int] = None   # Custom job limit; null = clear override
    clear_override: bool = False              # Pass true to remove max_jobs_override entirely
    is_subscribed: Optional[bool] = None
    note: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _effective_limit(user: User) -> int:
    if user.max_jobs_override is not None:
        return user.max_jobs_override
    return settings.PAID_JOB_LIMIT if (user.is_subscribed or False) else settings.FREE_JOB_LIMIT


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=AdminOverview)
async def get_overview(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()

    subscribed_users = (await db.execute(
        select(func.count(User.id)).where(User.is_subscribed == True)
    )).scalar_one()

    total_jobs = (await db.execute(select(func.count(ExtractionJob.id)))).scalar_one()

    jobs_today = (await db.execute(
        select(func.count(ExtractionJob.id)).where(ExtractionJob.created_at >= today_start)
    )).scalar_one()

    active_users_today = (await db.execute(
        select(func.count(func.distinct(ExtractionJob.user_id)))
        .where(ExtractionJob.created_at >= today_start)
    )).scalar_one()

    completed_jobs = (await db.execute(
        select(func.count(ExtractionJob.id)).where(ExtractionJob.status == JobStatus.COMPLETED)
    )).scalar_one()

    failed_jobs = (await db.execute(
        select(func.count(ExtractionJob.id)).where(ExtractionJob.status == JobStatus.FAILED)
    )).scalar_one()

    # Jobs per day for last 7 days
    jobs_last_7_days: List[DayStats] = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = (await db.execute(
            select(func.count(ExtractionJob.id)).where(
                ExtractionJob.created_at >= day_start,
                ExtractionJob.created_at < day_end,
            )
        )).scalar_one()
        jobs_last_7_days.append(DayStats(date=day_start.strftime("%b %d"), jobs=count))

    return AdminOverview(
        total_users=total_users,
        active_users_today=active_users_today,
        total_jobs=total_jobs,
        jobs_today=jobs_today,
        subscribed_users=subscribed_users,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
        jobs_last_7_days=jobs_last_7_days,
    )


@router.get("/users", response_model=List[UserAdminView])
async def list_users(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if search:
        term = f"%{search}%"
        query = query.where(
            (User.email.ilike(term)) | (User.full_name.ilike(term))
        )
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    out: List[UserAdminView] = []
    for u in users:
        job_count = (await db.execute(
            select(func.count(ExtractionJob.id)).where(ExtractionJob.user_id == u.id)
        )).scalar_one()

        out.append(UserAdminView(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            avatar_url=u.avatar_url,
            role=str(u.role.value if hasattr(u.role, 'value') else u.role),
            is_active=bool(u.is_active),
            is_subscribed=bool(u.is_subscribed or False),
            jobs_used=u.jobs_used or 0,
            max_jobs_override=u.max_jobs_override,
            effective_limit=_effective_limit(u),
            total_jobs=job_count,
            last_seen_at=u.last_seen_at.isoformat() if u.last_seen_at else None,
            created_at=u.created_at.isoformat() if u.created_at else "",
            auth_provider=str(u.auth_provider.value if hasattr(u.auth_provider, 'value') else u.auth_provider),
        ))
    return out


@router.get("/users/{user_id}/jobs")
async def get_user_jobs(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(ExtractionJob)
        .where(ExtractionJob.user_id == uid)
        .order_by(ExtractionJob.created_at.desc())
        .offset(skip).limit(limit)
    )
    jobs = result.scalars().all()
    return [{
        "id": str(j.id),
        "name": j.name,
        "status": str(j.status.value if hasattr(j.status, 'value') else j.status),
        "total_files": j.total_files,
        "processed_files": j.processed_files,
        "failed_files": j.failed_files,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        "error_message": j.error_message,
    } for j in jobs]


@router.patch("/users/{user_id}/credits")
async def adjust_user_credits(
    user_id: str,
    payload: AdjustCreditsRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.jobs_used is not None:
        user.jobs_used = max(0, payload.jobs_used)

    if payload.clear_override:
        user.max_jobs_override = None
    elif payload.max_jobs_override is not None:
        user.max_jobs_override = max(0, payload.max_jobs_override)

    if payload.is_subscribed is not None:
        user.is_subscribed = payload.is_subscribed

    await db.commit()
    return {
        "message": "Updated",
        "jobs_used": user.jobs_used,
        "max_jobs_override": user.max_jobs_override,
        "effective_limit": _effective_limit(user),
        "is_subscribed": user.is_subscribed,
    }


@router.get("/activity")
async def get_recent_activity(
    limit: int = Query(50, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recent analytics events joined with user info."""
    try:
        result = await db.execute(
            text("""
                SELECT
                    ae.id::text,
                    ae.event_type,
                    ae.page,
                    ae.element,
                    ae.created_at,
                    ae.user_id::text,
                    u.email,
                    u.full_name
                FROM analytics_events ae
                LEFT JOIN users u ON ae.user_id = u.id
                ORDER BY ae.created_at DESC
                LIMIT :limit
            """),
            {"limit": limit},
        )
        rows = result.mappings().all()
        return [{
            "id": r["id"],
            "event_type": r["event_type"],
            "page": r["page"],
            "element": r["element"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "user_id": r["user_id"],
            "user_email": r["email"],
            "user_name": r["full_name"],
        } for r in rows]
    except Exception:
        # Table may not exist on first boot yet
        return []
