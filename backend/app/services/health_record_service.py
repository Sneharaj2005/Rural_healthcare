"""
Health record service — CRUD operations for the health_records collection.
"""
from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional

from app.schemas.health_record import HealthRecordCreateRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)


class HealthRecordService:
    def __init__(self, db):
        self.col = db.health_records

    @staticmethod
    def _serialize(doc: dict) -> dict:
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def get_by_user(self, user_id: str) -> List[dict]:
        cursor = self.col.find({"user_id": user_id}).sort("date", -1)
        records = []
        async for doc in cursor:
            records.append(self._serialize(doc))
        return records

    async def get_by_id(self, record_id: str, user_id: str) -> Optional[dict]:
        try:
            doc = await self.col.find_one(
                {"_id": ObjectId(record_id), "user_id": user_id}
            )
            return self._serialize(doc) if doc else None
        except Exception:
            return None

    async def create(self, user_id: str, data: HealthRecordCreateRequest) -> dict:
        doc = {
            **data.model_dump(),
            "user_id":    user_id,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.col.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        logger.info("Health record created", extra={"record_id": doc["id"], "user_id": user_id})
        return doc

    async def delete(self, record_id: str, user_id: str) -> bool:
        try:
            result = await self.col.delete_one(
                {"_id": ObjectId(record_id), "user_id": user_id}
            )
            deleted = result.deleted_count > 0
            if deleted:
                logger.info("Health record deleted", extra={"record_id": record_id})
            return deleted
        except Exception:
            return False
