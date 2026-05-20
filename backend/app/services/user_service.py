"""
User service — all database operations for the users collection.
"""
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from pymongo.errors import DuplicateKeyError

from app.schemas.user import UserRegisterRequest, UserUpdateRequest
from app.utils.security import hash_password, verify_password
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UserService:
    def __init__(self, db):
        self.col = db.users

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _serialize(doc: dict) -> dict:
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    @staticmethod
    def _safe(user: dict) -> dict:
        return {k: v for k, v in user.items() if k != "hashed_password"}

    # ── Queries ───────────────────────────────────────────────────────────────
    async def get_by_email(self, email: str) -> Optional[dict]:
        doc = await self.col.find_one({"email": email.lower()})
        return self._serialize(doc) if doc else None

    async def get_by_id(self, user_id: str) -> Optional[dict]:
        try:
            doc = await self.col.find_one({"_id": ObjectId(user_id)})
            return self._serialize(doc) if doc else None
        except Exception:
            return None

    # ── Mutations ─────────────────────────────────────────────────────────────
    async def create(self, data: UserRegisterRequest) -> dict:
        doc = {
            "full_name":         data.full_name,
            "email":             data.email.lower(),
            "phone":             data.phone or None,
            "hashed_password":   hash_password(data.password),
            "date_of_birth":     None,
            "blood_group":       None,
            "allergies":         None,
            "emergency_contact": None,
            "preferred_language": "en",
            "is_active":         True,
            "created_at":        datetime.now(timezone.utc),
            "updated_at":        None,
        }
        try:
            result = await self.col.insert_one(doc)
        except DuplicateKeyError as exc:
            # Surface a clear message for the duplicate email case
            raise ValueError("An account with this email already exists.") from exc
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        logger.info("User created", extra={"user_id": doc["id"], "email": doc["email"]})
        return doc

    async def update(self, user_id: str, data: UserUpdateRequest) -> Optional[dict]:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return await self.get_by_id(user_id)
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.col.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
        logger.info("User updated", extra={"user_id": user_id})
        return await self.get_by_id(user_id)

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> bool:
        """Verify current password then update to new hash. Returns False if current is wrong."""
        user = await self.get_by_id(user_id)
        if not user or not verify_password(current_password, user["hashed_password"]):
            return False
        await self.col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "hashed_password": hash_password(new_password),
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        logger.info("Password changed", extra={"user_id": user_id})
        return True

    async def reset_password(self, user_id: str, new_password: str) -> bool:
        """Unconditionally set a new password (used after token verification)."""
        try:
            await self.col.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "hashed_password": hash_password(new_password),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            logger.info("Password reset", extra={"user_id": user_id})
            return True
        except Exception:
            return False

    async def deactivate(self, user_id: str) -> bool:
        result = await self.col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
        )
        return result.modified_count > 0

    async def update_language(self, user_id: str, language: str) -> Optional[dict]:
        """Update only the preferred_language field."""
        VALID = {"en", "hi", "kn", "te", "ta"}
        if language not in VALID:
            return None
        await self.col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"preferred_language": language, "updated_at": datetime.now(timezone.utc)}},
        )
        logger.info("Language updated", extra={"user_id": user_id, "language": language})
        return await self.get_by_id(user_id)
