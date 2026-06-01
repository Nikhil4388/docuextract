from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
import hashlib
import hmac
import base64
from cryptography.fernet import Fernet

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash. Uses SHA-256 to avoid bcrypt 72-byte limit."""
    expected = hashlib.sha256(plain_password.encode()).hexdigest()
    return hmac.compare_digest(expected, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(subject: Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Any) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def _get_fernet_key(key: str) -> Fernet:
    hashed = hashlib.sha256(key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(hashed))


def encrypt_secret(value: str) -> str:
    f = _get_fernet_key(settings.ENCRYPTION_KEY)
    return f.encrypt(value.encode()).decode()


def decrypt_secret(token: str) -> str:
    f = _get_fernet_key(settings.ENCRYPTION_KEY)
    return f.decrypt(token.encode()).decode()
