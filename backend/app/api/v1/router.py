"""
API v1 router — aggregates all endpoint routers under /api/v1.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, users, health_records, ai_chat,
    location, vaccination, notifications, maternal, guidance
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router,           prefix="/auth",           tags=["Authentication"])
api_v1_router.include_router(users.router,          prefix="/users",          tags=["Users"])
api_v1_router.include_router(health_records.router, prefix="/health-records", tags=["Health Records"])
api_v1_router.include_router(ai_chat.router,        prefix="/ai",             tags=["AI Chat"])
api_v1_router.include_router(location.router,       prefix="/location",       tags=["Location"])
api_v1_router.include_router(vaccination.router,    prefix="/vaccination",    tags=["Vaccination"])
api_v1_router.include_router(notifications.router,  prefix="/notifications",  tags=["Notifications"])
api_v1_router.include_router(maternal.router,       prefix="/maternal",       tags=["Maternal Care"])
api_v1_router.include_router(guidance.router,       prefix="/guidance",       tags=["Guidance"])
