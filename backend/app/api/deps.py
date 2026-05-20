"""
FastAPI dependency injection helpers.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.database.connection import get_db
from app.utils.security import decode_token
from app.utils.logger import get_logger

logger = get_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
) -> dict:
    """Validate Bearer JWT → return authenticated user dict."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token, "access")
    if payload is None:
        raise credentials_exc

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exc

    from app.services.user_service import UserService
    user = await UserService(db).get_by_id(user_id)
    if user is None:
        raise credentials_exc

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    return user


async def get_current_user_optional(
    token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)),
    db=Depends(get_db),
) -> dict | None:
    """Like get_current_user but returns None instead of raising for missing token."""
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
