"""
Chat history service — all MongoDB operations for conversations and messages.

Collections used:
  chat_conversations  — conversation sessions (one per chat thread)
  chat_messages       — individual messages within a conversation

Indexes (created at startup in connection.py):
  chat_conversations: user_id, (user_id, last_message_at DESC)
  chat_messages:      conversation_id, (conversation_id, timestamp ASC)
"""
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Auto-title: first 60 chars of the first user message
_MAX_TITLE_LEN = 60


def _title_from_message(text: str) -> str:
    text = text.strip()
    return text[:_MAX_TITLE_LEN] + ("…" if len(text) > _MAX_TITLE_LEN else "")


def _str_id(doc: dict) -> dict:
    """Convert ObjectId _id → string id in-place."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


class ChatHistoryService:
    def __init__(self, db):
        self.convs = db.chat_conversations
        self.msgs  = db.chat_messages

    # ── Conversations ─────────────────────────────────────────────────────────

    async def get_conversations(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Return paginated list of non-deleted conversations for a user."""
        filt = {"user_id": user_id, "is_deleted": False}

        total  = await self.convs.count_documents(filt)
        cursor = (
            self.convs.find(filt, {"_id": 1, "title": 1, "message_count": 1, "last_message_at": 1, "created_at": 1, "user_id": 1})
            .sort("last_message_at", -1)
            .skip(skip)
            .limit(limit)
        )
        docs = [_str_id(d) async for d in cursor]
        return docs, total

    async def get_conversation(
        self, conversation_id: str, user_id: str
    ) -> Optional[dict]:
        """Fetch a single conversation (ownership-checked)."""
        try:
            doc = await self.convs.find_one(
                {"_id": ObjectId(conversation_id), "user_id": user_id, "is_deleted": False}
            )
            return _str_id(doc) if doc else None
        except Exception:
            return None

    async def create_conversation(self, user_id: str, first_message: str) -> dict:
        """Create a new conversation seeded with the first user message as title."""
        now = datetime.now(timezone.utc)
        doc = {
            "user_id":         user_id,
            "title":           _title_from_message(first_message),
            "message_count":   0,
            "last_message_at": now,
            "created_at":      now,
            "is_deleted":      False,
        }
        result = await self.convs.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        logger.info("Conversation created", extra={"conv_id": doc["id"], "user_id": user_id})
        return doc

    async def update_conversation_title(
        self, conversation_id: str, user_id: str, title: str
    ) -> Optional[dict]:
        await self.convs.update_one(
            {"_id": ObjectId(conversation_id), "user_id": user_id},
            {"$set": {"title": title}},
        )
        return await self.get_conversation(conversation_id, user_id)

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Soft-delete a conversation (keeps messages in DB for audit)."""
        try:
            result = await self.convs.update_one(
                {"_id": ObjectId(conversation_id), "user_id": user_id},
                {"$set": {"is_deleted": True}},
            )
            deleted = result.modified_count > 0
            if deleted:
                logger.info("Conversation deleted", extra={"conv_id": conversation_id})
            return deleted
        except Exception:
            return False

    async def delete_all_conversations(self, user_id: str) -> int:
        """Soft-delete ALL conversations for a user. Returns count deleted."""
        result = await self.convs.update_many(
            {"user_id": user_id, "is_deleted": False},
            {"$set": {"is_deleted": True}},
        )
        logger.info("All conversations deleted", extra={"user_id": user_id, "count": result.modified_count})
        return result.modified_count

    # ── Messages ──────────────────────────────────────────────────────────────

    async def get_messages(
        self,
        conversation_id: str,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict]:
        """Return messages for a conversation (oldest first)."""
        # Verify ownership first
        conv = await self.get_conversation(conversation_id, user_id)
        if not conv:
            return []

        cursor = (
            self.msgs.find({"conversation_id": conversation_id}, {"_id": 1, "role": 1, "content": 1, "timestamp": 1, "is_emergency": 1})
            .sort("timestamp", 1)
            .skip(skip)
            .limit(limit)
        )
        return [_str_id(d) async for d in cursor]

    async def save_message(
        self,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        is_emergency: bool = False,
    ) -> dict:
        """Insert a message and update the parent conversation's metadata."""
        now = datetime.now(timezone.utc)
        doc = {
            "conversation_id": conversation_id,
            "user_id":         user_id,
            "role":            role,
            "content":         content,
            "is_emergency":    is_emergency,
            "timestamp":       now,
        }
        result = await self.msgs.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)

        # Update conversation metadata atomically
        await self.convs.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$inc": {"message_count": 1},
                "$set": {"last_message_at": now},
            },
        )
        return doc

    async def delete_messages(self, conversation_id: str, user_id: str) -> int:
        """Hard-delete all messages in a conversation (used when purging history)."""
        result = await self.msgs.delete_many(
            {"conversation_id": conversation_id, "user_id": user_id}
        )
        return result.deleted_count

    async def get_conversation_with_messages(
        self, conversation_id: str, user_id: str
    ) -> Optional[dict]:
        """Return conversation metadata + all messages in one call."""
        conv = await self.get_conversation(conversation_id, user_id)
        if not conv:
            return None
        conv["messages"] = await self.get_messages(conversation_id, user_id)
        return conv
