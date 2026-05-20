"""
APScheduler background task scheduler.

Runs a daily job at the configured hour to send vaccination reminders
to all active users.
"""
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _daily_reminder_job() -> None:
    """Async wrapper called by APScheduler."""
    try:
        from app.database.connection import get_db
        from app.services.notification_service import NotificationService
        db  = get_db()
        svc = NotificationService(db)
        result = await svc.send_reminders_all_users()
        logger.info("Daily reminder job finished", extra=result)
    except Exception as exc:
        logger.error("Daily reminder job failed", exc_info=exc)


async def _async_maternal_reminder_job() -> None:
    try:
        from app.database.connection import get_db
        from app.services.notification_service import NotificationService
        db  = get_db()
        svc = NotificationService(db)
        result = await svc.send_maternal_reminders_all_users()
        logger.info("Daily maternal reminder job finished", extra=result)
    except Exception as exc:
        logger.error("Daily maternal reminder job failed", exc_info=exc)



def start_scheduler() -> None:
    """Create and start the APScheduler instance. Called at app startup."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    _scheduler.add_job(
        _daily_reminder_job,
        trigger=CronTrigger(
            hour=settings.SCHEDULER_HOUR,
            minute=settings.SCHEDULER_MINUTE,
        ),
        id="daily_vaccination_reminder",
        name="Daily Vaccination Reminder",
        replace_existing=True,
        misfire_grace_time=3600,   # allow up to 1 h late
    )
    
    _scheduler.add_job(
        _async_maternal_reminder_job,
        trigger=CronTrigger(
            hour=settings.SCHEDULER_HOUR,
            minute=settings.SCHEDULER_MINUTE,
        ),
        id="daily_maternal_reminder",
        name="Daily Maternal Care Reminder",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    _scheduler.start()
    logger.info(
        "Scheduler started",
        extra={
            "jobs":   ["daily_vaccination_reminder", "daily_maternal_reminder"],
            "time":   f"{settings.SCHEDULER_HOUR:02d}:{settings.SCHEDULER_MINUTE:02d} IST",
        },
    )



def stop_scheduler() -> None:
    """Gracefully shut down the scheduler. Called at app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")


def get_scheduler() -> AsyncIOScheduler | None:
    return _scheduler
