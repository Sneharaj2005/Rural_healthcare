"""
Vaccination service — profiles, records, and schedule computation.

Uses India's Universal Immunisation Programme (UIP) schedule as the
built-in reference. Doses are defined as weeks/months after birth.
"""
from bson import ObjectId
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional

from app.schemas.vaccination import (
    VaccineProfileCreate, VaccineProfileUpdate,
    VaccineRecordCreate,
    VaccineProfileResponse, VaccineRecordResponse,
    ScheduleItem, VaccinationScheduleResponse, VaccinationSummary,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── India UIP schedule ────────────────────────────────────────────────────────
# Each entry: (vaccine_name, dose_number, days_after_birth, age_label)
UIP_SCHEDULE: list[tuple[str, int, int, str]] = [
    ("BCG",             1,   0,    "At birth"),
    ("Hepatitis B",     1,   0,    "At birth"),
    ("OPV",             1,   0,    "At birth"),
    ("OPV",             2,  42,    "6 weeks"),
    ("Pentavalent",     1,  42,    "6 weeks"),
    ("Rotavirus",       1,  42,    "6 weeks"),
    ("IPV",             1,  42,    "6 weeks"),
    ("OPV",             3,  70,    "10 weeks"),
    ("Pentavalent",     2,  70,    "10 weeks"),
    ("Rotavirus",       2,  70,    "10 weeks"),
    ("OPV",             4,  98,    "14 weeks"),
    ("Pentavalent",     3,  98,    "14 weeks"),
    ("Rotavirus",       3,  98,    "14 weeks"),
    ("IPV",             2,  98,    "14 weeks"),
    ("Measles-Rubella", 1, 270,    "9 months"),
    ("JE",              1, 270,    "9 months"),
    ("Vitamin A",       1, 270,    "9 months"),
    ("Measles-Rubella", 2, 548,    "18 months"),
    ("DPT Booster",     1, 548,    "18 months"),
    ("OPV Booster",     1, 548,    "18 months"),
    ("JE",              2, 548,    "18 months"),
    ("Vitamin A",       2, 548,    "18 months"),
    ("DPT Booster",     2, 1825,   "5 years"),
    ("Td",              1, 3650,   "10 years"),
    ("Td",              2, 5475,   "15 years"),
]


def _age_text(dob_str: str) -> str:
    try:
        dob  = date.fromisoformat(dob_str)
        today = date.today()
        years  = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        months = (today.month - dob.month) % 12
        if years == 0:
            return f"{months} month{'s' if months != 1 else ''}"
        if months == 0:
            return f"{years} year{'s' if years != 1 else ''}"
        return f"{years} yr {months} mo"
    except Exception:
        return "Unknown age"


def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


class VaccinationService:
    def __init__(self, db):
        self.profiles = db.vaccine_profiles
        self.records  = db.vaccine_records

    # ── Profiles ──────────────────────────────────────────────────────────────
    async def list_profiles(self, user_id: str) -> List[dict]:
        cursor = self.profiles.find({"user_id": user_id, "is_deleted": False}).sort("created_at", -1)
        docs = [_serialize(d) async for d in cursor]
        for d in docs:
            d["age_text"] = _age_text(d.get("date_of_birth", ""))
        return docs

    async def get_profile(self, profile_id: str, user_id: str) -> Optional[dict]:
        try:
            doc = await self.profiles.find_one(
                {"_id": ObjectId(profile_id), "user_id": user_id, "is_deleted": False}
            )
            if doc:
                _serialize(doc)
                doc["age_text"] = _age_text(doc.get("date_of_birth", ""))
            return doc
        except Exception:
            return None

    async def create_profile(self, user_id: str, data: VaccineProfileCreate) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            **data.model_dump(),
            "user_id":    user_id,
            "is_deleted": False,
            "created_at": now,
            "updated_at": now,
        }
        result = await self.profiles.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        doc["age_text"] = _age_text(data.date_of_birth)
        logger.info("Vaccine profile created", extra={"profile_id": doc["id"]})
        return doc

    async def update_profile(self, profile_id: str, user_id: str,
                             data: VaccineProfileUpdate) -> Optional[dict]:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return await self.get_profile(profile_id, user_id)
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.profiles.update_one(
            {"_id": ObjectId(profile_id), "user_id": user_id},
            {"$set": updates},
        )
        return await self.get_profile(profile_id, user_id)

    async def delete_profile(self, profile_id: str, user_id: str) -> bool:
        result = await self.profiles.update_one(
            {"_id": ObjectId(profile_id), "user_id": user_id},
            {"$set": {"is_deleted": True}},
        )
        return result.modified_count > 0

    # ── Records ───────────────────────────────────────────────────────────────
    async def list_records(self, profile_id: str, user_id: str) -> List[dict]:
        # Verify ownership
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return []
        cursor = self.records.find({"profile_id": profile_id}).sort("date_given", -1)
        return [_serialize(d) async for d in cursor]

    async def add_record(self, profile_id: str, user_id: str,
                         data: VaccineRecordCreate) -> Optional[dict]:
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return None
        now = datetime.now(timezone.utc)
        doc = {
            **data.model_dump(),
            "profile_id": profile_id,
            "created_at": now,
        }
        result = await self.records.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        logger.info("Vaccine record added", extra={"profile_id": profile_id})
        return doc

    async def delete_record(self, record_id: str, user_id: str) -> bool:
        # Verify ownership via profile
        try:
            rec = await self.records.find_one({"_id": ObjectId(record_id)})
            if not rec:
                return False
            profile = await self.get_profile(rec["profile_id"], user_id)
            if not profile:
                return False
            result = await self.records.delete_one({"_id": ObjectId(record_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    # ── Schedule computation ──────────────────────────────────────────────────
    async def get_schedule(self, profile_id: str, user_id: str) -> Optional[dict]:
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return None

        dob   = date.fromisoformat(profile["date_of_birth"])
        today = date.today()

        # Build set of completed vaccines from records
        records = await self.list_records(profile_id, user_id)
        completed_set: set[tuple[str, int]] = set()
        completed_dates: dict[tuple[str, int], str] = {}
        for r in records:
            key = (r["vaccine_name"], r["dose_number"])
            completed_set.add(key)
            completed_dates[key] = r["date_given"]

        schedule: list[ScheduleItem] = []
        for vaccine_name, dose_num, days, age_label in UIP_SCHEDULE:
            due_date  = dob + timedelta(days=days)
            key       = (vaccine_name, dose_num)
            days_diff = (due_date - today).days

            if key in completed_set:
                status = "completed"
            elif days_diff < 0:
                status = "overdue"
            elif days_diff <= 30:
                status = "due"
            else:
                status = "upcoming"

            schedule.append(ScheduleItem(
                vaccine_name  = vaccine_name,
                dose_number   = dose_num,
                due_date      = due_date.isoformat(),
                due_age_text  = age_label,
                status        = status,
                given_date    = completed_dates.get(key),
                days_until    = days_diff if status != "completed" else None,
            ))

        counts = {s: sum(1 for i in schedule if i.status == s)
                  for s in ("completed", "due", "overdue", "upcoming")}

        return {
            "profile":   profile,
            "schedule":  [i.model_dump() for i in schedule],
            "completed": counts["completed"],
            "due":       counts["due"],
            "overdue":   counts["overdue"],
            "upcoming":  counts["upcoming"],
            "total":     len(schedule),
        }

    # ── Dashboard summary ─────────────────────────────────────────────────────
    async def get_summary(self, user_id: str) -> dict:
        profiles = await self.list_profiles(user_id)
        total_due = total_overdue = 0
        next_due_date = next_due_name = next_due_profile = None

        for p in profiles:
            sched = await self.get_schedule(p["id"], user_id)
            if not sched:
                continue
            total_due     += sched["due"]
            total_overdue += sched["overdue"]
            # Find the soonest upcoming/due item
            for item in sched["schedule"]:
                if item["status"] in ("due", "upcoming") and item["days_until"] is not None:
                    if next_due_date is None or item["due_date"] < next_due_date:
                        next_due_date    = item["due_date"]
                        next_due_name    = f"{item['vaccine_name']} (dose {item['dose_number']})"
                        next_due_profile = p["name"]

        return {
            "total_profiles":   len(profiles),
            "total_due":        total_due,
            "total_overdue":    total_overdue,
            "next_due_name":    next_due_name,
            "next_due_date":    next_due_date,
            "next_due_profile": next_due_profile,
        }
