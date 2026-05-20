"""
User profile endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_db, get_current_user
from app.schemas.user import UserUpdateRequest, LanguageUpdateRequest
from app.services.user_service import UserService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

SAFE = lambda u: {k: v for k, v in u.items() if k != "hashed_password"}  # noqa: E731


@router.get("/me", summary="Get current user profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    return SAFE(current_user)


@router.put("/me", summary="Update current user profile")
async def update_me(
    payload: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    svc = UserService(db)
    updated = await svc.update(current_user["id"], payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return SAFE(updated)


@router.put("/me/language", summary="Update preferred language")
async def update_language(
    payload: LanguageUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Store the user's preferred UI language (en | hi | kn | te | ta)."""
    svc = UserService(db)
    updated = await svc.update_language(current_user["id"], payload.preferred_language)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid language code. Supported: en, hi, kn, te, ta",
        )
    logger.info("Language preference saved", extra={
        "user_id": current_user["id"],
        "language": payload.preferred_language,
    })
    return {"preferred_language": payload.preferred_language, "message": "Language preference saved."}
