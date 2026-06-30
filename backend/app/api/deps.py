from typing import Optional
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole


async def get_current_user(
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Read the access token from the httpOnly cookie (invisible to JS)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    if not access_token:
        raise credentials_exception
    try:
        payload = decode_token(access_token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


async def get_optional_user(
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not access_token:
        return None
    try:
        return await get_current_user(access_token=access_token, db=db)
    except HTTPException:
        return None
