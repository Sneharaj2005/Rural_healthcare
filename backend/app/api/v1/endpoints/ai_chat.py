"""
AI chat endpoints — with MongoDB conversation persistence.

Routes:
  POST /ai/chat                              — send message, get + save response
  GET  /ai/suggestions                       — starter / follow-up questions
  GET  /ai/conversations                     — list user's conversations
  POST /ai/conversations                     — create empty conversation
  GET  /ai/conversations/{id}                — get conversation + messages
  PATCH /ai/conversations/{id}               — rename conversation
  DELETE /ai/conversations/{id}              — delete one conversation
  DELETE /ai/conversations                   — delete ALL conversations
  GET  /ai/conversations/{id}/messages       — paginated messages
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_db, get_current_user
from app.schemas.ai_chat import (
    ChatRequest, ChatResponse,
    SuggestedQuestionsResponse,
    ConversationListResponse,
    ConversationDetail,
    ConversationSummary,
    UpdateConversationRequest,
    StoredMessage,
)
from app.services.ai_service import ai_service
from app.services.chat_history_service import ChatHistoryService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ── Helper ────────────────────────────────────────────────────────────────────
def _svc(db) -> ChatHistoryService:
    return ChatHistoryService(db)


# ── Chat (send + persist) ─────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse, summary="Send a message to the AI assistant")
async def chat(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    svc     = _svc(db)
    user_id = current_user["id"]

    # 1. Resolve or create conversation
    conv_id = payload.conversation_id
    if conv_id:
        conv = await svc.get_conversation(conv_id, user_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    else:
        conv = await svc.create_conversation(user_id, payload.message)
        conv_id = conv["id"]

    # 2. Save user message
    user_msg = await svc.save_message(
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=payload.message,
    )

    # 3. Call Gemini — pass language from payload (falls back to user's stored preference)
    lang = payload.language or current_user.get("preferred_language", "en") or "en"
    logger.info("AI chat", extra={"user_id": user_id, "conv_id": conv_id, "lang": lang})
    ai_response = await ai_service.chat(payload.message, payload.history or [], language=lang)

    # 4. Save assistant message
    ai_msg = await svc.save_message(
        conversation_id=conv_id,
        user_id=user_id,
        role="assistant",
        content=ai_response.response,
        is_emergency=ai_response.is_emergency,
    )

    return ChatResponse(
        response=ai_response.response,
        is_emergency=ai_response.is_emergency,
        suggested_questions=ai_response.suggested_questions,
        conversation_id=conv_id,
        message_id=ai_msg["id"],
    )


# ── Suggestions ───────────────────────────────────────────────────────────────
@router.get("/suggestions", response_model=SuggestedQuestionsResponse, summary="Get starter questions")
async def get_suggestions(
    topic: str = Query(default="default"),
    current_user: dict = Depends(get_current_user),
):
    return SuggestedQuestionsResponse(questions=ai_service.get_suggested_questions(topic))


# ── List conversations ────────────────────────────────────────────────────────
@router.get("/conversations", response_model=ConversationListResponse, summary="List all conversations")
async def list_conversations(
    skip:  int = Query(default=0,  ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    convs, total = await _svc(db).get_conversations(current_user["id"], skip, limit)
    return ConversationListResponse(conversations=convs, total=total)


# ── Get one conversation with messages ────────────────────────────────────────
@router.get("/conversations/{conversation_id}", response_model=ConversationDetail, summary="Get conversation + messages")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    conv = await _svc(db).get_conversation_with_messages(conversation_id, current_user["id"])
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conv


# ── Rename conversation ───────────────────────────────────────────────────────
@router.patch("/conversations/{conversation_id}", response_model=ConversationSummary, summary="Rename a conversation")
async def rename_conversation(
    conversation_id: str,
    payload: UpdateConversationRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updated = await _svc(db).update_conversation_title(
        conversation_id, current_user["id"], payload.title
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return updated


# ── Delete one conversation ───────────────────────────────────────────────────
@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a conversation")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    deleted = await _svc(db).delete_conversation(conversation_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")


# ── Delete ALL conversations ──────────────────────────────────────────────────
@router.delete("/conversations", summary="Delete all conversations for the current user")
async def delete_all_conversations(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    count = await _svc(db).delete_all_conversations(current_user["id"])
    return {"message": f"Deleted {count} conversation(s)."}


# ── Paginated messages for a conversation ─────────────────────────────────────
@router.get("/conversations/{conversation_id}/messages", summary="Get messages for a conversation")
async def get_messages(
    conversation_id: str,
    skip:  int = Query(default=0,   ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    msgs = await _svc(db).get_messages(conversation_id, current_user["id"], skip, limit)
    return {"messages": msgs, "total": len(msgs)}
