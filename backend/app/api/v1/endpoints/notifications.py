"""
Notification endpoints.

Routes:
  GET  /notifications/prefs              — get user's notification preferences
  PUT  /notifications/prefs              — update preferences
  GET  /notifications/logs               — reminder send history
  POST /notifications/send-test          — send a test email
  POST /notifications/send-now           — trigger reminders for current user immediately
  GET  /notifications/scheduler/status   — scheduler job info (admin-useful)
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

from app.api.deps import get_db, get_current_user
from app.config.settings import settings
from app.schemas.notification import (
    NotificationPrefsUpdate,
    NotificationPrefsResponse,
    ReminderLogsResponse,
    SendTestEmailRequest,
    ManualReminderRequest,
)
from app.services.notification_service import NotificationService
from app.services.email_service import email_service
from app.services.scheduler import get_scheduler
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _svc(db) -> NotificationService:
    return NotificationService(db)


# ── Preferences ───────────────────────────────────────────────────────────────
@router.get("/prefs", response_model=NotificationPrefsResponse,
            summary="Get notification preferences")
async def get_prefs(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    return await _svc(db).get_prefs(current_user["id"])


@router.put("/prefs", response_model=NotificationPrefsResponse,
            summary="Update notification preferences")
async def update_prefs(
    payload: NotificationPrefsUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    return await _svc(db).update_prefs(
        current_user["id"],
        payload.model_dump(exclude_none=True),
    )


# ── Logs ──────────────────────────────────────────────────────────────────────
@router.get("/logs", summary="Get reminder send history")
async def get_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    logs = await _svc(db).get_logs(current_user["id"], limit)
    return {"logs": logs, "total": len(logs)}


# ── Test email ────────────────────────────────────────────────────────────────
@router.post("/send-test", summary="Send a test email to verify SMTP configuration")
async def send_test_email(
    payload: SendTestEmailRequest,
    current_user: dict = Depends(get_current_user),
):
    if not settings.EMAIL_ENABLED:
        return {
            "success": False,
            "message": "Email is not enabled. Set EMAIL_ENABLED=true and configure SMTP settings in .env.",
        }
    ok = await email_service.send_test_email(payload.email)
    return {
        "success": ok,
        "message": "Test email sent successfully." if ok else "Failed to send test email. Check SMTP settings.",
    }


# ── Manual trigger ────────────────────────────────────────────────────────────
@router.post("/send-now", summary="Trigger vaccination reminders for the current user now")
async def send_reminders_now(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Immediately checks all vaccine profiles and sends reminder emails
    for any overdue or upcoming vaccines. Runs in the background.
    """
    svc = _svc(db)

    async def _run():
        sent = await svc.send_reminders_for_user(current_user["id"])
        logger.info("Manual reminder triggered", extra={
            "user_id": current_user["id"], "sent": sent
        })

    background_tasks.add_task(_run)
    return {
        "message": "Reminder check started in the background. "
                   "You will receive an email if any vaccines are due or overdue.",
    }


# ── Scheduler status ──────────────────────────────────────────────────────────
@router.get("/scheduler/status", summary="Get scheduler job status")
async def scheduler_status(current_user: dict = Depends(get_current_user)):
    scheduler = get_scheduler()
    if not scheduler or not scheduler.running:
        return {"running": False, "jobs": []}

    jobs = []
    for job in scheduler.get_jobs():
        next_run = job.next_run_time
        jobs.append({
            "id":       job.id,
            "name":     job.name,
            "next_run": next_run.isoformat() if next_run else None,
        })
    return {"running": True, "jobs": jobs}
