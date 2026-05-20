"""
User request / response schemas (Pydantic I/O contracts).
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re


# ── Validators ────────────────────────────────────────────────────────────────
def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number.")
    return v


# ── Request schemas ───────────────────────────────────────────────────────────
class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    phone: Optional[str] = Field(None, examples=["+91 98765 43210"])
    password: str = Field(..., min_length=8, examples=["SecurePass1"])

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        return _validate_password(v)


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = Field(None, examples=["1990-06-15"])
    blood_group: Optional[str] = Field(None, examples=["O+"])
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = Field(None, examples=["hi"])


class LanguageUpdateRequest(BaseModel):
    preferred_language: str = Field(..., pattern="^(en|hi|kn|te|ta)$")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v):
        return _validate_password(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v):
        return _validate_password(v)


class VerifyTokenRequest(BaseModel):
    token: str


# ── Response schemas ──────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = "en"
    is_active: bool
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int          # seconds until expiry
    user: UserResponse


class TokenVerifyResponse(BaseModel):
    valid: bool
    user_id: Optional[str] = None
