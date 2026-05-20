"""
Notification service — manages user preferences, reminder logs,
and orchestrates vaccination reminder emails.
"""
from bson import ObjectId
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List

from app.services.email_service import email_service
from app.services.vaccination_service import VaccinationService
from app.services.maternal_service import MaternalService
from app.utils.logger import get_logger

logger = get_logger(__name__)

APP_URL = "http://localhost:5173"   # overridden by env in production


def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


class NotificationService:
    def __init__(self, db):
        self.db       = db
        self.prefs    = db.notification_prefs
        self.logs     = db.notification_logs
        self.users    = db.users

    # ── Preferences ───────────────────────────────────────────────────────────
    async def get_prefs(self, user_id: str) -> dict:
        doc = await self.prefs.find_one({"user_id": user_id})
        if not doc:
            return {
                "user_id":                user_id,
                "email_reminders_enabled": True,
                "reminder_days_before":    7,
                "reminder_email":          None,
            }
        _serialize(doc)
        return doc

    async def update_prefs(self, user_id: str, data: dict) -> dict:
        data["user_id"]    = user_id
        data["updated_at"] = datetime.now(timezone.utc)
        await self.prefs.update_one(
            {"user_id": user_id},
            {"$set": data},
            upsert=True,
        )
        return await self.get_prefs(user_id)

    # ── Logs ──────────────────────────────────────────────────────────────────
    async def get_logs(self, user_id: str, limit: int = 50) -> List[dict]:
        cursor = (
            self.logs.find({"user_id": user_id})
            .sort("sent_at", -1)
            .limit(limit)
        )
        return [_serialize(d) async for d in cursor]

    async def _log(self, user_id: str, profile_name: str,
                   vaccine_name: str, dose: int, due_date: str,
                   status: str, error: Optional[str] = None) -> None:
        await self.logs.insert_one({
            "user_id":      user_id,
            "profile_name": profile_name,
            "vaccine_name": vaccine_name,
            "dose_number":  dose,
            "due_date":     due_date,
            "sent_at":      datetime.now(timezone.utc),
            "channel":      "email",
            "status":       status,
            "error":        error,
        })

    # ── Core reminder logic ───────────────────────────────────────────────────
    async def send_reminders_for_user(
        self,
        user_id: str,
        days_before: Optional[int] = None,
    ) -> int:
        """
        Check all vaccine profiles for this user and send email reminders
        for vaccines that are overdue or due within `days_before` days.
        Returns the number of emails sent.
        """
        prefs = await self.get_prefs(user_id)
        if not prefs.get("email_reminders_enabled", True):
            return 0

        window = days_before or prefs.get("reminder_days_before", 7)

        # Get user email
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return 0
        to_email = prefs.get("reminder_email") or user.get("email")
        if not to_email:
            return 0

        user_name = user.get("full_name", "there")
        vacc_svc  = VaccinationService(self.db)
        profiles  = await vacc_svc.list_profiles(user_id)
        sent      = 0

        for profile in profiles:
            sched = await vacc_svc.get_schedule(profile["id"], user_id)
            if not sched:
                continue

            # Collect vaccines that need a reminder
            to_remind = [
                item for item in sched["schedule"]
                if item["status"] in ("overdue", "due")
                or (
                    item["status"] == "upcoming"
                    and item.get("days_until") is not None
                    and 0 <= item["days_until"] <= window
                )
            ]

            if not to_remind:
                continue

            ok = await email_service.send_vaccination_reminder(
                to_email     = to_email,
                user_name    = user_name,
                profile_name = profile["name"],
                profile_age  = profile.get("age_text", ""),
                vaccines     = to_remind,
                app_url      = APP_URL,
            )

            status = "sent" if ok else "failed"
            for item in to_remind:
                await self._log(
                    user_id      = user_id,
                    profile_name = profile["name"],
                    vaccine_name = item["vaccine_name"],
                    dose         = item["dose_number"],
                    due_date     = item["due_date"],
                    status       = status,
                )

            if ok:
                sent += 1
                logger.info(
                    "Vaccination reminder sent",
                    extra={"user_id": user_id, "profile": profile["name"],
                           "vaccines": len(to_remind)},
                )

        return sent

    async def send_maternal_reminders_for_user(
        self,
        user_id: str,
        days_before: Optional[int] = None,
    ) -> int:
        prefs = await self.get_prefs(user_id)
        if not prefs.get("email_reminders_enabled", True):
            return 0

        window = days_before or prefs.get("reminder_days_before", 7)
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return 0
        to_email = prefs.get("reminder_email") or user.get("email")
        if not to_email:
            return 0

        user_name = user.get("full_name", "there")
        mat_svc   = MaternalService(self.db)
        profile   = await mat_svc.get_active_profile(user_id)
        if not profile:
            return 0
            
        today_str = date.today().isoformat()
        all_visits = await mat_svc.list_visits(profile["id"], user_id)
        upcoming   = [
            v for v in all_visits 
            if today_str <= v.get("visit_date", "") <= (date.today() + timedelta(days=window)).isoformat()
        ]
        
        today_water = await mat_svc.get_today_water(profile["id"])
        water_needed = today_water < 10
        
        if not upcoming and not water_needed:
            return 0
            
        ok = await email_service.send_maternal_reminder(
            to_email     = to_email,
            user_name    = user_name,
            profile_name = profile["mother_name"],
            current_week = profile["current_week"],
            visits       = upcoming,
            water_needed = water_needed,
            app_url      = APP_URL,
        )
        
        if ok:
            logger.info("Maternal reminder sent", extra={"user_id": user_id, "profile": profile["mother_name"]})
            return 1
        return 0

    async def send_reminders_all_users(self) -> dict:
        """
        Scheduled job — iterate all active users and send reminders.
        Called by APScheduler daily.
        """
        cursor = self.users.find({"is_active": True}, {"_id": 1})
        total_users = total_sent = 0
        async for user_doc in cursor:
            user_id = str(user_doc["_id"])
            try:
                sent = await self.send_reminders_for_user(user_id)
                total_sent  += sent
                total_users += 1
            except Exception as exc:
                logger.error("Reminder job error", extra={"user_id": user_id}, exc_info=exc)

        logger.info(
            "Daily reminder job complete",
            extra={"users_processed": total_users, "emails_sent": total_sent},
        )
        return {"users_processed": total_users, "emails_sent": total_sent}

    async def send_maternal_reminders_all_users(self) -> dict:
        cursor = self.users.find({"is_active": True}, {"_id": 1})
        total_users = total_sent = 0
        async for user_doc in cursor:
            user_id = str(user_doc["_id"])
            try:
                sent = await self.send_maternal_reminders_for_user(user_id)
                total_sent  += sent
                total_users += 1
            except Exception as exc:
                logger.error("Maternal reminder job error", extra={"user_id": user_id}, exc_info=exc)

        logger.info(
            "Daily maternal reminder job complete",
            extra={"users_processed": total_users, "emails_sent": total_sent},
        )
        return {"users_processed": total_users, "emails_sent": total_sent}

