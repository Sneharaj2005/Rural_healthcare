"""
AI chat request / response schemas — includes conversation storage schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ── Shared ────────────────────────────────────────────────────────────────────
class ChatMessageSchema(BaseModel):
    """A single chat turn (used in request history)."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)


# ── Chat request / response ───────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[ChatMessageSchema]] = Field(default_factory=list)
    conversation_id: Optional[str] = Field(
        None, description="Existing conversation to append to. Omit to start a new one."
    )
    language: Optional[str] = Field("en", description="Preferred response language: en|hi|kn|te|ta")


class ChatResponse(BaseModel):
    response: str
    is_emergency: bool = False
    suggested_questions: List[str] = []
    conversation_id: str = ""       # always returned so frontend can track the session
    message_id: str = ""            # ID of the saved assistant message


class SuggestedQuestionsResponse(BaseModel):
    questions: List[str]


# ── Stored message ────────────────────────────────────────────────────────────
class StoredMessage(BaseModel):
    """A message as stored in MongoDB and returned to the client."""
    id: str
    conversation_id: str
    role: str
    content: str
    is_emergency: bool = False
    timestamp: datetime


# ── Conversation ──────────────────────────────────────────────────────────────
class ConversationSummary(BaseModel):
    """Lightweight conversation object for the history list."""
    id: str
    title: str
    message_count: int
    last_message_at: datetime
    created_at: datetime


class ConversationDetail(ConversationSummary):
    """Full conversation with all messages."""
    messages: List[StoredMessage]


class ConversationListResponse(BaseModel):
    conversations: List[ConversationSummary]
    total: int


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
