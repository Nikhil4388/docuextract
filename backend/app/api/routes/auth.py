from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Response, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import secrets
import random
import httpx

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.models.user import User, AuthProvider
from app.api.deps import get_current_user
from app.services.email_service import send_otp_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _make_tokens(user_id: str) -> dict:
    return {
        "access_token": create_access_token(str(user_id)),
        "refresh_token": create_refresh_token(str(user_id)),
        "token_type": "bearer",
    }


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        auth_provider=AuthProvider.EMAIL,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    return {"message": "Registration successful. You can now log in.", "email": payload.email}


# ── OTP ───────────────────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    if user.is_verified:
        return {"message": "Email already verified. Please login."}
    if user.verification_token != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired. Please register again.")
    user.is_verified = True
    user.verification_token = None
    user.reset_token_expires = None
    return {"message": "Email verified! You can now login."}


@router.post("/resend-otp")
async def resend_otp(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user and not user.is_verified:
        otp = _generate_otp()
        user.verification_token = otp
        user.reset_token_expires = datetime.utcnow() + timedelta(minutes=10)
        background_tasks.add_task(send_otp_email, user.email, otp, user.full_name)
    return {"message": "If that email exists and is unverified, a new OTP was sent."}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified.")
    return _make_tokens(str(user.id))


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout():
    return {"message": "Logged out"}


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise ValueError()
        user_id = data["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return _make_tokens(str(user.id))


# ── Password reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        await db.commit()
        background_tasks.add_task(send_password_reset_email, user.email, token)
    return {"message": "If that email exists, a reset link was sent."}


@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.reset_token == payload.token))
    user = result.scalar_one_or_none()
    if not user or (user.reset_token_expires and user.reset_token_expires < datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    return {"message": "Password reset successful. You can now login."}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = get_password_hash(payload.new_password)
    return {"message": "Password changed successfully"}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google")
async def google_auth():
    from urllib.parse import urlencode
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/google/callback"
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        if "error" in token_data:
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=oauth_failed")

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = userinfo_resp.json()

    # Find or create the user
    result = await db.execute(
        select(User).where(User.oauth_id == userinfo["sub"], User.auth_provider == AuthProvider.GOOGLE)
    )
    user = result.scalar_one_or_none()
    if not user:
        result2 = await db.execute(select(User).where(User.email == userinfo["email"]))
        user = result2.scalar_one_or_none()
        if not user:
            user = User(
                email=userinfo["email"],
                full_name=userinfo.get("name"),
                avatar_url=userinfo.get("picture"),
                auth_provider=AuthProvider.GOOGLE,
                oauth_id=userinfo["sub"],
                is_verified=True,
            )
            db.add(user)
            await db.flush()
        else:
            user.auth_provider = AuthProvider.GOOGLE
            user.oauth_id = userinfo["sub"]
            user.is_verified = True
            if userinfo.get("name"):    user.full_name = userinfo["name"]
            if userinfo.get("picture"): user.avatar_url = userinfo["picture"]
            await db.flush()
    else:
        if userinfo.get("name"):    user.full_name = userinfo["name"]
        if userinfo.get("picture"): user.avatar_url = userinfo["picture"]
        await db.flush()

    tokens = _make_tokens(str(user.id))
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={tokens['access_token']}"
        f"&refresh_token={tokens['refresh_token']}"
    )
