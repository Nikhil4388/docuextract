from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import encrypt_secret
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    location: Optional[str]
    role: str
    is_verified: bool
    auth_provider: Optional[str]
    # Subscription
    is_subscribed: bool = False
    is_admin: bool = False
    jobs_used: int = 0
    free_limit: int = 2
    paid_limit: int = 20
    effective_limit: int = 2   # actual limit for THIS user (respects max_jobs_override)
    max_jobs_override: Optional[int] = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None


class UpdateApiKeysRequest(BaseModel):
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    is_admin = current_user.email in settings.admin_email_list
    is_subscribed = current_user.is_subscribed or False

    # Compute the true job limit this user faces:
    # 1. Admin-set override wins if present
    # 2. Otherwise paid limit for subscribers, free limit for free tier
    # 3. Admins are unlimited — use a large sentinel so the UI never shows "limit reached"
    if is_admin:
        effective_limit = 999999
    elif current_user.max_jobs_override is not None:
        effective_limit = current_user.max_jobs_override
    elif is_subscribed:
        effective_limit = settings.PAID_JOB_LIMIT
    else:
        effective_limit = settings.FREE_JOB_LIMIT

    return UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        location=current_user.location,
        role=current_user.role,
        is_verified=current_user.is_verified,
        auth_provider=current_user.auth_provider,
        is_subscribed=is_subscribed,
        is_admin=is_admin,
        jobs_used=current_user.jobs_used or 0,
        free_limit=settings.FREE_JOB_LIMIT,
        paid_limit=settings.PAID_JOB_LIMIT,
        effective_limit=effective_limit,
        max_jobs_override=current_user.max_jobs_override,
    )


@router.patch("/me")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.location is not None:
        current_user.location = payload.location
    await db.commit()
    return {"message": "Profile updated"}


@router.put("/me/api-keys")
async def update_api_keys(
    payload: UpdateApiKeysRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.anthropic_api_key is not None:
        current_user.anthropic_api_key_enc = encrypt_secret(payload.anthropic_api_key)
    if payload.openai_api_key is not None:
        current_user.openai_api_key_enc = encrypt_secret(payload.openai_api_key)
    await db.commit()
    return {"message": "API keys updated"}


@router.get("/me/api-keys")
async def get_api_keys_status(current_user: User = Depends(get_current_user)):
    return {
        "anthropic": current_user.anthropic_api_key_enc is not None,
        "openai": current_user.openai_api_key_enc is not None,
    }
