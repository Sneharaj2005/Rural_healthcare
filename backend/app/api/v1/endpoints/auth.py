"""
Authentication endpoints.

Routes:
  POST /auth/register          — create account
  POST /auth/login             — get JWT
  POST /auth/logout            — blacklist token
  GET  /auth/me                — verify token + return user
  POST /auth/change-password   — change password (authenticated)
  POST /auth/forgot-password   — request reset token
  POST /auth/reset-password    — apply new password via reset token
  POST /auth/verify-token      — check if a token is still valid
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_db, get_current_user
from app.config.settings import settings
from app.schemas.user import (
    UserRegisterRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyTokenRequest,
    TokenVerifyResponse,
)
from app.services.user_service import UserService
from app.utils.security import (
    verify_password,
    create_access_token,
    create_reset_token,
    decode_token,
    blacklist_token,
)
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Seconds until access token expires (sent to client so it can schedule refresh)
_EXPIRES_IN = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _auth_payload(user: dict) -> dict:
    """Build the standard auth response body."""
    token = create_access_token({"sub": user["id"]})
    safe  = {k: v for k, v in user.items() if k != "hashed_password"}
    return {
        "access_token": token,
        "token_type":   "bearer",
        "expires_in":   _EXPIRES_IN,
        "user":         safe,
    }


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register a new account")
async def register(payload: UserRegisterRequest, db=Depends(get_db)):
    svc = UserService(db)
    if await svc.get_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user = await svc.create(payload)
    logger.info("User registered", extra={"email": payload.email})
    return _auth_payload(user)


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", summary="Login and receive a JWT access token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    svc  = UserService(db)
    user = await svc.get_by_email(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    logger.info("User logged in", extra={"user_id": user["id"]})
    return _auth_payload(user)


# ── Logout ────────────────────────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordBearer as _OAuth2
from fastapi import Request

_token_scheme = _OAuth2(tokenUrl="/api/v1/auth/login", auto_error=False)


@router.post("/logout", summary="Invalidate the current access token")
async def logout(
    current_user: dict = Depends(get_current_user),
    raw_token: str = Depends(_token_scheme),
):
    if raw_token:
        blacklist_token(raw_token)
    logger.info("User logged out", extra={"user_id": current_user["id"]})
    return {"message": "Logged out successfully."}


# ── Verify token / get current user ──────────────────────────────────────────
@router.get("/me", summary="Verify token and return current user profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "hashed_password"}


@router.post("/verify-token", response_model=TokenVerifyResponse, summary="Check if a token is valid")
async def verify_token(payload: VerifyTokenRequest):
    decoded = decode_token(payload.token, "access")
    if decoded:
        return TokenVerifyResponse(valid=True, user_id=decoded.get("sub"))
    return TokenVerifyResponse(valid=False)


# ── Change password (authenticated) ──────────────────────────────────────────
@router.post("/change-password", summary="Change password for the logged-in user")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    svc = UserService(db)
    ok  = await svc.change_password(
        current_user["id"], payload.current_password, payload.new_password
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    return {"message": "Password changed successfully."}


# ── Forgot password ───────────────────────────────────────────────────────────
@router.post("/forgot-password", summary="Request a password reset token")
async def forgot_password(payload: ForgotPasswordRequest, db=Depends(get_db)):
    """
    Always returns 200 to prevent email enumeration.
    In production: send the reset token via email.
    In development: the token is returned directly in the response.
    """
    svc  = UserService(db)
    user = await svc.get_by_email(payload.email)

    if not user:
        # Return generic success to prevent enumeration
        return {"message": "If that email exists, a reset link has been sent."}

    reset_token = create_reset_token(user["id"])
    logger.info("Password reset requested", extra={"user_id": user["id"]})

    response: dict = {"message": "If that email exists, a reset link has been sent."}

    # ⚠️  DEV ONLY — expose token in response so you can test without email setup
    if settings.is_development:
        response["dev_reset_token"] = reset_token
        response["dev_note"] = (
            "This token is only returned in development mode. "
            "In production, it would be emailed to the user."
        )

    return response


# ── Reset password ────────────────────────────────────────────────────────────
@router.post("/reset-password", summary="Reset password using a reset token")
async def reset_password(payload: ResetPasswordRequest, db=Depends(get_db)):
    decoded = decode_token(payload.token, "reset")
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user_id = decoded.get("sub")
    svc     = UserService(db)
    ok      = await svc.reset_password(user_id, payload.new_password)

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again.",
        )

    # Invalidate the reset token so it can't be reused
    blacklist_token(payload.token)
    logger.info("Password reset completed", extra={"user_id": user_id})
    return {"message": "Password reset successfully. You can now log in."}
