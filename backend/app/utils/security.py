"""
Security utilities — password hashing, JWT access tokens, reset tokens.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config.settings import settings

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def check_password_strength(password: str) -> dict:
    """
    Return a dict with score (0-4) and list of unmet requirements.
    Used for server-side validation feedback.
    """
    issues = []
    if len(password) < 8:
        issues.append("At least 8 characters required")
    if not any(c.isupper() for c in password):
        issues.append("At least one uppercase letter required")
    if not any(c.islower() for c in password):
        issues.append("At least one lowercase letter required")
    if not any(c.isdigit() for c in password):
        issues.append("At least one number required")
    score = 4 - len(issues)
    return {"score": max(score, 0), "issues": issues, "strong": score == 4}


# ── JWT ───────────────────────────────────────────────────────────────────────
TokenType = Literal["access", "reset"]

# In-memory token blacklist (for logout / reset invalidation)
# In production replace with Redis SET with TTL
_blacklisted_tokens: set[str] = set()


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    payload = data.copy()
    payload["type"] = "access"
    payload["exp"] = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_reset_token(user_id: str) -> str:
    """Short-lived token for password reset (30 min)."""
    payload = {
        "sub":  user_id,
        "type": "reset",
        "exp":  datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
        "jti":  secrets.token_hex(16),   # unique token ID
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str, expected_type: TokenType = "access") -> Optional[dict]:
    """
    Decode and verify a JWT.
    Returns payload dict or None if invalid / expired / blacklisted / wrong type.
    """
    if token in _blacklisted_tokens:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


# Keep old name as alias so existing code doesn't break
decode_access_token = lambda token: decode_token(token, "access")  # noqa: E731


def blacklist_token(token: str) -> None:
    """Add a token to the blacklist (logout / reset)."""
    _blacklisted_tokens.add(token)


# ── Secure random token (for future email-based reset) ────────────────────────
def generate_secure_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)
