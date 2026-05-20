"""
Notification / reminder schemas.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


class NotificationPrefsUpdate(BaseModel):
    """User's notification preferences."""
    email_reminders_enabled: bool = True
    reminder_days_before:    int  = Field(7, ge=1, le=30)
    reminder_email:          Optional[EmailStr] = None   # override user email


class NotificationPrefsResponse(BaseModel):
    email_reminders_enabled: bool
    reminder_days_before:    int
    reminder_email:          Optional[str] = None


class ReminderLog(BaseModel):
    """One entry in the notification_logs collection."""
    id:           str
    user_id:      str
    profile_name: str
    vaccine_name: str
    dose_number:  int
    due_date:     str
    sent_at:      datetime
    channel:      str   # "email"
    status:       str   # "sent" | "failed"
    error:        Optional[str] = None


class ReminderLogsResponse(BaseModel):
    logs:  List[ReminderLog]
    total: int


class SendTestEmailRequest(BaseModel):
    email: EmailStr


class ManualReminderRequest(BaseModel):
    profile_id: str
