"""
Centralised application settings loaded from .env via pydantic-settings.
All environment variables are validated and typed here — import `settings`
anywhere in the app instead of reading os.environ directly.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "Rural Health Companion AI Lite"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"          # development | staging | production
    DEBUG: bool = True

    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "rural_health_companion"
    MONGODB_MAX_POOL_SIZE: int = 10
    MONGODB_MIN_POOL_SIZE: int = 1

    # ── JWT ───────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change_me_in_production_use_a_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080   # 7 days

    # ── Gemini AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── Google Maps / Places ──────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""
    PLACES_SEARCH_RADIUS_M: int = 5000   # default 5 km radius

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"   # json | text

    # ── Password reset ────────────────────────────────────────────────────────
    RESET_TOKEN_EXPIRE_MINUTES: int = 30   # short-lived reset tokens
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST:     str  = "smtp.gmail.com"
    SMTP_PORT:     int  = 587
    SMTP_USERNAME: str  = ""          # your Gmail / SMTP address
    SMTP_PASSWORD: str  = ""          # app password (not account password)
    SMTP_FROM_NAME: str = "RHC AI Lite"
    SMTP_FROM_EMAIL: str = ""         # defaults to SMTP_USERNAME if empty
    EMAIL_ENABLED: bool = False       # set True once SMTP creds are configured

    # ── Notification scheduler ────────────────────────────────────────────────
    REMINDER_DAYS_BEFORE: int = 7     # send reminder N days before due date
    SCHEDULER_HOUR:       int = 8     # run daily at 08:00 local time
    SCHEDULER_MINUTE:     int = 0

    # ── Pagination ────────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# ── Singleton ─────────────────────────────────────────────────────────────────
settings = Settings()
