from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import base64
from cryptography.fernet import Fernet

from app.core.config import settings

# ── Password hashing — bcrypt (NOT plain SHA-256) ─────────────────────────────
_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time bcrypt verification. Safe against timing attacks."""
    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password with bcrypt (salted + slow)."""
    return _pwd_context.hash(password)


def needs_rehash(hashed_password: str) -> bool:
    """True if the stored hash needs upgrading to current settings."""
    return _pwd_context.needs_update(hashed_password)


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_access_token(subject: Any, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": str(subject),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Any) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": str(subject),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises JWTError on invalid/expired tokens."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def decode_access_token(token: str) -> dict:
    """Decode and verify — rejects refresh tokens used as access tokens."""
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    return payload


def decode_refresh_token(token: str) -> dict:
    """Decode and verify — rejects access tokens used as refresh tokens."""
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise JWTError("Not a refresh token")
    return payload


# ── Field-level encryption (stored API keys) ──────────────────────────────────

def _get_fernet() -> Fernet:
    raw = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(raw))


def encrypt_secret(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_secret(token: str) -> str:
    return _get_fernet().decrypt(token.encode()).decode()
