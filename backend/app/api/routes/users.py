from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import encrypt_secret, decrypt_secret
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_verified: bool

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UpdateApiKeysRequest(BaseModel):
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        is_verified=current_user.is_verified,
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
    return {"message": "API keys updated"}


@router.get("/me/api-keys")
async def get_api_keys_status(current_user: User = Depends(get_current_user)):
    """Return whether keys are set, not the actual values."""
    return {
        "anthropic": current_user.anthropic_api_key_enc is not None,
        "openai": current_user.openai_api_key_enc is not None,
    }
