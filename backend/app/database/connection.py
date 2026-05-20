"""
MongoDB Atlas / local connection manager using Motor (async driver).

Usage:
    from app.database.connection import get_db

    async def my_route(db=Depends(get_db)):
        ...
"""
import motor.motor_asyncio
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Module-level singletons ───────────────────────────────────────────────────
_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_db:     motor.motor_asyncio.AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Open the MongoDB connection and create required indexes.
    Called once at application startup via the lifespan handler.
    """
    global _client, _db

    logger.info("Connecting to MongoDB…", extra={"url": settings.MONGODB_URL.split("@")[-1]})

    _client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
        minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
        serverSelectionTimeoutMS=5_000,
    )
    _db = _client[settings.MONGODB_DB_NAME]

    # Verify connectivity
    await _client.admin.command("ping")

    # ── Indexes ───────────────────────────────────────────────────────────────
    await _db.users.create_index("email", unique=True)
    # phone is optional — do NOT create a unique index on it
    await _db.health_records.create_index("user_id")
    await _db.health_records.create_index([("user_id", 1), ("date", -1)])

    # Chat history indexes
    await _db.chat_conversations.create_index("user_id")
    await _db.chat_conversations.create_index([("user_id", 1), ("last_message_at", -1)])
    await _db.chat_conversations.create_index([("user_id", 1), ("is_deleted", 1)])
    await _db.chat_messages.create_index("conversation_id")
    await _db.chat_messages.create_index([("conversation_id", 1), ("timestamp", 1)])

    # Vaccination indexes
    await _db.vaccine_profiles.create_index("user_id")
    await _db.vaccine_profiles.create_index([("user_id", 1), ("is_deleted", 1)])
    await _db.vaccine_records.create_index("profile_id")
    await _db.vaccine_records.create_index([("profile_id", 1), ("date_given", -1)])

    # Notification indexes
    await _db.notification_prefs.create_index("user_id", unique=True)
    await _db.notification_logs.create_index("user_id")
    await _db.notification_logs.create_index([("user_id", 1), ("sent_at", -1)])

    # Maternal care indexes
    await _db.maternal_profiles.create_index("user_id")
    await _db.maternal_profiles.create_index([("user_id", 1), ("is_active", 1)])
    await _db.maternal_visits.create_index("profile_id")
    await _db.maternal_visits.create_index([("profile_id", 1), ("visit_date", 1)])
    await _db.maternal_water_logs.create_index([("profile_id", 1), ("date", 1)], unique=True)

    logger.info(
        "MongoDB connected",
        extra={"database": settings.MONGODB_DB_NAME},
    )


async def close_db() -> None:
    """Close the MongoDB connection on application shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """
    FastAPI dependency — inject the active database instance.

    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() first.")
    return _db
