"""
Maternal care service — pregnancy tracking, doctor visits, water intake,
and week-by-week health guidance.
"""
from bson import ObjectId
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional

from app.schemas.maternal import (
    PregnancyProfileCreate, PregnancyProfileUpdate,
    DoctorVisitCreate, WaterLogCreate,
    WeekInfo,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Week-by-week data (trimester 1: 1-13, T2: 14-26, T3: 27-40) ──────────────
WEEK_DATA: dict[int, dict] = {
    4:  {"size": "Poppy seed",    "emoji": "🌱", "dev": "The embryo is implanting. Heart cells begin forming."},
    5:  {"size": "Sesame seed",   "emoji": "🌿", "dev": "Heart starts beating. Brain and spinal cord forming."},
    6:  {"size": "Lentil",        "emoji": "🫘", "dev": "Facial features beginning. Arm and leg buds appear."},
    7:  {"size": "Blueberry",     "emoji": "🫐", "dev": "Brain growing rapidly. Hands and feet forming."},
    8:  {"size": "Kidney bean",   "emoji": "🫘", "dev": "All major organs forming. Baby starts moving."},
    9:  {"size": "Grape",         "emoji": "🍇", "dev": "Fingers and toes visible. Heartbeat detectable."},
    10: {"size": "Strawberry",    "emoji": "🍓", "dev": "Baby is now a fetus. Vital organs functional."},
    11: {"size": "Lime",          "emoji": "🍋", "dev": "Fingernails forming. Baby can open and close fists."},
    12: {"size": "Plum",          "emoji": "🍑", "dev": "Reflexes developing. Risk of miscarriage drops significantly."},
    13: {"size": "Peach",         "emoji": "🍑", "dev": "End of first trimester. Baby can suck thumb."},
    14: {"size": "Lemon",         "emoji": "🍋", "dev": "Baby can make facial expressions. Kidneys producing urine."},
    16: {"size": "Avocado",       "emoji": "🥑", "dev": "Baby hears sounds. Skeleton hardening."},
    18: {"size": "Sweet potato",  "emoji": "🍠", "dev": "Baby yawns and hiccups. Fingerprints forming."},
    20: {"size": "Banana",        "emoji": "🍌", "dev": "Halfway! Baby swallows amniotic fluid. Hair growing."},
    22: {"size": "Papaya",        "emoji": "🍈", "dev": "Baby responds to touch. Eyelids and eyebrows visible."},
    24: {"size": "Corn",          "emoji": "🌽", "dev": "Lungs developing. Baby has sleep-wake cycles."},
    26: {"size": "Scallion",      "emoji": "🧅", "dev": "Eyes open for first time. Brain developing rapidly."},
    28: {"size": "Eggplant",      "emoji": "🍆", "dev": "Third trimester begins. Baby can dream (REM sleep)."},
    30: {"size": "Cabbage",       "emoji": "🥬", "dev": "Baby's brain growing fast. Bones fully developed."},
    32: {"size": "Squash",        "emoji": "🎃", "dev": "Baby practising breathing. Gaining weight rapidly."},
    34: {"size": "Butternut",     "emoji": "🎃", "dev": "Lungs nearly mature. Baby settling into birth position."},
    36: {"size": "Honeydew",      "emoji": "🍈", "dev": "Baby considered early term. Most organs ready."},
    38: {"size": "Watermelon",    "emoji": "🍉", "dev": "Baby is full term. Ready for birth any time."},
    40: {"size": "Pumpkin",       "emoji": "🎃", "dev": "Due date! Baby fully developed and ready to meet you."},
}

TRIMESTER_TIPS = {
    1: {
        "mother": [
            "Take folic acid 400 mcg daily to prevent neural tube defects.",
            "Avoid alcohol, smoking, and raw/undercooked foods.",
            "Rest as much as possible — fatigue is normal in early pregnancy.",
            "Stay hydrated — aim for 8-10 glasses of water daily.",
        ],
        "nutrition": [
            "Eat iron-rich foods: spinach, lentils, beans, fortified cereals.",
            "Include calcium sources: milk, curd, paneer, ragi.",
            "Eat small frequent meals to manage nausea.",
            "Avoid papaya, pineapple, and raw sprouts.",
        ],
        "warning": [
            "Heavy bleeding or severe cramping — seek care immediately.",
            "Severe vomiting preventing any food/water intake.",
            "High fever above 38°C.",
        ],
    },
    2: {
        "mother": [
            "Start gentle prenatal exercises like walking and yoga.",
            "Sleep on your left side to improve blood flow to baby.",
            "Wear comfortable, loose clothing.",
            "Attend all scheduled ANC (Antenatal Care) checkups.",
        ],
        "nutrition": [
            "Increase protein: eggs, dal, chicken, fish, tofu.",
            "Eat omega-3 rich foods: walnuts, flaxseeds, fish.",
            "Include vitamin C foods: amla, oranges, guava.",
            "Avoid excess salt to prevent swelling.",
        ],
        "warning": [
            "Sudden swelling of face, hands, or feet.",
            "Severe headache or vision changes.",
            "Decreased or no fetal movement after 20 weeks.",
        ],
    },
    3: {
        "mother": [
            "Prepare your hospital bag and birth plan.",
            "Practice breathing exercises for labour.",
            "Rest frequently — sleeping on left side is best.",
            "Know the signs of labour: contractions, water breaking.",
        ],
        "nutrition": [
            "Eat fibre-rich foods to prevent constipation: fruits, vegetables, whole grains.",
            "Small frequent meals — baby is pressing on your stomach.",
            "Stay well hydrated — helps prevent preterm labour.",
            "Include dates — may help ease labour.",
        ],
        "warning": [
            "Regular contractions before 37 weeks (preterm labour).",
            "Sudden decrease in baby movements.",
            "Severe abdominal pain or vaginal bleeding.",
            "Signs of pre-eclampsia: headache, blurred vision, swelling.",
        ],
    },
}

DAILY_TIPS = [
    "Take a 15-minute walk in fresh air today. Gentle movement helps circulation.",
    "Practice deep breathing for 5 minutes — it calms both you and baby.",
    "Eat a handful of nuts today for healthy fats and protein.",
    "Call a loved one — emotional support is vital during pregnancy.",
    "Rest with your feet elevated to reduce swelling.",
    "Drink a glass of warm milk before bed for calcium and better sleep.",
    "Do gentle stretches to relieve back pain.",
]

NUTRITION_TIPS = [
    "Iron + Vitamin C together: eat spinach with lemon juice for better absorption.",
    "Calcium tip: have a glass of milk or curd with every main meal.",
    "Protein goal: include dal, eggs, or paneer in at least 2 meals today.",
    "Hydration: add a slice of lemon or cucumber to your water for variety.",
    "Folate foods: eat green leafy vegetables, lentils, and fortified cereals daily.",
    "Avoid: raw meat, unpasteurised dairy, excess caffeine (max 200mg/day).",
    "Snack smart: banana with peanut butter gives energy + protein + potassium.",
]


def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _get_week_info(week: int, trimester: int) -> dict:
    """Get the closest week data entry."""
    # Find nearest week in WEEK_DATA
    available = sorted(WEEK_DATA.keys())
    closest   = min(available, key=lambda w: abs(w - week))
    data      = WEEK_DATA[closest]
    tips      = TRIMESTER_TIPS.get(trimester, TRIMESTER_TIPS[1])
    return {
        "week":            week,
        "trimester":       trimester,
        "baby_size":       data["size"],
        "baby_size_emoji": data["emoji"],
        "development":     data["dev"],
        "mother_tips":     tips["mother"],
        "nutrition":       tips["nutrition"],
        "warning_signs":   tips["warning"],
    }


class MaternalService:
    def __init__(self, db):
        self.profiles = db.maternal_profiles
        self.visits   = db.maternal_visits
        self.water    = db.maternal_water_logs

    # ── Profile ───────────────────────────────────────────────────────────────
    async def get_active_profile(self, user_id: str) -> Optional[dict]:
        doc = await self.profiles.find_one(
            {"user_id": user_id, "is_active": True},
            {"_id": 1, "user_id": 1, "mother_name": 1, "lmp_date": 1, "created_at": 1, "current_week": 1}
        )
        if doc:
            _serialize(doc)
            self._enrich(doc)
        return doc

    async def get_profile(self, profile_id: str, user_id: str) -> Optional[dict]:
        try:
            doc = await self.profiles.find_one(
                {"_id": ObjectId(profile_id), "user_id": user_id}
            )
            if doc:
                _serialize(doc)
                self._enrich(doc)
            return doc
        except Exception:
            return None

    def _enrich(self, doc: dict) -> None:
        """Add computed fields: current_week, trimester, due_date, days_remaining."""
        try:
            lmp       = date.fromisoformat(doc["lmp_date"])
            today     = date.today()
            due       = lmp + timedelta(days=280)
            days_preg = (today - lmp).days
            week      = max(1, min(42, days_preg // 7))
            trimester = 1 if week <= 13 else (2 if week <= 26 else 3)
            doc["current_week"]   = week
            doc["trimester"]      = trimester
            doc["due_date"]       = due.isoformat()
            doc["days_remaining"] = max(0, (due - today).days)
        except Exception:
            doc["current_week"]   = 1
            doc["trimester"]      = 1
            doc["due_date"]       = ""
            doc["days_remaining"] = 0

    async def create_profile(self, user_id: str, data: PregnancyProfileCreate) -> dict:
        # Deactivate any existing active profile
        await self.profiles.update_many(
            {"user_id": user_id, "is_active": True},
            {"$set": {"is_active": False}},
        )
        now = datetime.now(timezone.utc)
        doc = {
            **data.model_dump(),
            "user_id":    user_id,
            "is_active":  True,
            "created_at": now,
            "updated_at": now,
        }
        result = await self.profiles.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        self._enrich(doc)
        logger.info("Maternal profile created", extra={"profile_id": doc["id"]})
        return doc

    async def update_profile(self, profile_id: str, user_id: str,
                             data: PregnancyProfileUpdate) -> Optional[dict]:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc)
            await self.profiles.update_one(
                {"_id": ObjectId(profile_id), "user_id": user_id},
                {"$set": updates},
            )
        return await self.get_profile(profile_id, user_id)

    # ── Doctor visits ─────────────────────────────────────────────────────────
    async def list_visits(self, profile_id: str, user_id: str) -> List[dict]:
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return []
        cursor = self.visits.find(
            {"profile_id": profile_id},
            {"_id": 1, "visit_date": 1, "visit_type": 1, "hospital": 1, "notes": 1, "completed": 1}
        ).sort("visit_date", 1)
        return [_serialize(d) async for d in cursor]

    async def add_visit(self, profile_id: str, user_id: str,
                        data: DoctorVisitCreate) -> Optional[dict]:
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return None
        now = datetime.now(timezone.utc)
        doc = {
            **data.model_dump(),
            "profile_id":  profile_id,
            "week_number": profile.get("current_week", 0),
            "created_at":  now,
        }
        result = await self.visits.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        return doc

    async def delete_visit(self, visit_id: str, user_id: str) -> bool:
        try:
            visit = await self.visits.find_one({"_id": ObjectId(visit_id)})
            if not visit:
                return False
            profile = await self.get_profile(visit["profile_id"], user_id)
            if not profile:
                return False
            result = await self.visits.delete_one({"_id": ObjectId(visit_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    # ── Water intake ──────────────────────────────────────────────────────────
    async def log_water(self, profile_id: str, user_id: str,
                        data: WaterLogCreate) -> Optional[dict]:
        profile = await self.get_profile(profile_id, user_id)
        if not profile:
            return None
        # Upsert: one log per day per profile
        now = datetime.now(timezone.utc)
        await self.water.update_one(
            {"profile_id": profile_id, "date": data.date},
            {"$set": {"glasses": data.glasses, "updated_at": now},
             "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        doc = await self.water.find_one({"profile_id": profile_id, "date": data.date})
        return _serialize(doc) if doc else None

    async def get_today_water(self, profile_id: str) -> int:
        today = date.today().isoformat()
        doc   = await self.water.find_one({"profile_id": profile_id, "date": today})
        return doc.get("glasses", 0) if doc else 0

    async def get_water_history(self, profile_id: str, days: int = 7) -> List[dict]:
        start = (date.today() - timedelta(days=days)).isoformat()
        cursor = self.water.find(
            {"profile_id": profile_id, "date": {"$gte": start}}
        ).sort("date", -1)
        return [_serialize(d) async for d in cursor]

    # ── Dashboard ─────────────────────────────────────────────────────────────
    async def get_dashboard(self, user_id: str) -> Optional[dict]:
        profile = await self.get_active_profile(user_id)
        if not profile:
            return None

        week      = profile["current_week"]
        trimester = profile["trimester"]
        today_str = date.today().isoformat()

        # Week info
        week_info = _get_week_info(week, trimester)

        # Water today
        today_water = await self.get_today_water(profile["id"])

        # Visits
        all_visits = await self.list_visits(profile["id"], user_id)
        upcoming   = [v for v in all_visits if v.get("visit_date", "") >= today_str][:3]
        recent     = [v for v in all_visits if v.get("visit_date", "") < today_str][:3]

        # Rotating tips
        day_idx       = date.today().timetuple().tm_yday
        daily_tip     = DAILY_TIPS[day_idx % len(DAILY_TIPS)]
        nutrition_tip = NUTRITION_TIPS[day_idx % len(NUTRITION_TIPS)]

        return {
            "profile":        profile,
            "week_info":      week_info,
            "today_water":    today_water,
            "water_goal":     10,
            "upcoming_visits": upcoming,
            "recent_visits":   recent,
            "daily_tip":      daily_tip,
            "nutrition_tip":  nutrition_tip,
        }
