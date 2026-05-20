"""
Guidance service — manages pregnancy health guidance articles and categories in MongoDB.
Supports on-demand AI translation via Gemini, cached in MongoDB.
"""
from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional
import asyncio

from app.schemas.guidance import GuidanceArticleCreate
from app.utils.logger import get_logger

logger = get_logger(__name__)

SUPPORTED_LANGS = {"hi", "kn", "te", "ta"}

LANG_NAMES = {
    "hi": "Hindi",
    "kn": "Kannada",
    "te": "Telugu",
    "ta": "Tamil",
}

def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def _translate_text(text: str, lang: str) -> str:
    """Translate text to target language using Gemini AI."""
    try:
        from app.services.ai_service import ai_service
        if not ai_service._model:
            return text
        lang_name = LANG_NAMES.get(lang, lang)
        prompt = (
            f"Translate the following text to {lang_name}. "
            f"Return ONLY the translated text, no explanations, no quotes.\n\n{text}"
        )
        session = ai_service._model.start_chat(history=[])
        response = await session.send_message_async(prompt)
        translated = response.text.strip()
        return translated if translated else text
    except Exception as exc:
        logger.warning(f"Translation failed for lang={lang}: {exc}")
        return text


class GuidanceService:
    def __init__(self, db):
        self.articles = db.guidance_articles

    async def _ensure_translation(self, doc: dict, lang: str) -> dict:
        """Ensure article has translation for lang. Translate + cache if missing."""
        if lang == "en" or lang not in SUPPORTED_LANGS:
            return doc

        translations = doc.get("translations", {})
        if lang in translations:
            # Already translated — apply and return
            t = translations[lang]
            doc["title"]   = t.get("title",   doc["title"])
            doc["content"] = t.get("content", doc["content"])
            return doc

        # Translate title and content sequentially to respect rate limits
        logger.info(f"Translating article '{doc.get('title', '')[:40]}' to {lang}")
        title_t   = await _translate_text(doc["title"],   lang)
        await asyncio.sleep(0.3)
        content_t = await _translate_text(doc["content"], lang)

        # Cache translation in MongoDB
        try:
            await self.articles.update_one(
                {"_id": ObjectId(doc["id"])},
                {"$set": {
                    f"translations.{lang}.title":   title_t,
                    f"translations.{lang}.content": content_t,
                }}
            )
        except Exception as exc:
            logger.warning(f"Failed to cache translation: {exc}")

        doc["title"]   = title_t
        doc["content"] = content_t
        return doc

    async def get_categories(self, lang: str = "en") -> List[dict]:
        """Aggregate distinct categories and their article counts."""
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}, "icon": {"$first": "$icon"}}},
            {"$project": {"_id": 0, "category": "$_id", "article_count": "$count", "icon": "$icon"}},
            {"$sort": {"category": 1}}
        ]
        cursor = self.articles.aggregate(pipeline)
        return [doc async for doc in cursor]

    async def get_articles_by_category(self, category: str, lang: str = "en") -> List[dict]:
        cursor = self.articles.find({"category": category}).sort("created_at", -1)
        docs = [_serialize(d) async for d in cursor]

        if lang != "en" and lang in SUPPORTED_LANGS:
            # Translate sequentially with delay to respect rate limits (5 req/min)
            translated = []
            for doc in docs:
                result = await self._ensure_translation(doc, lang)
                translated.append(result)
                # Small delay between articles to avoid rate limiting
                await asyncio.sleep(0.5)
            return translated

        return docs

    async def get_all_articles(self) -> List[dict]:
        cursor = self.articles.find().sort("created_at", -1)
        return [_serialize(d) async for d in cursor]

    async def get_article(self, article_id: str) -> Optional[dict]:
        try:
            doc = await self.articles.find_one({"_id": ObjectId(article_id)})
            return _serialize(doc) if doc else None
        except Exception:
            return None

    async def create_article(self, data: GuidanceArticleCreate) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        result = await self.articles.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        return doc

    async def seed_default_guidance(self) -> None:
        """Populate database with essential pregnancy guidance if empty."""
        count = await self.articles.count_documents({})
        if count >= 10:
            return

        logger.info("Seeding default pregnancy guidance articles...")
        default_articles = [
            {"category": "Warning Signs", "icon": "⚠️",
             "title": "When to Seek Immediate Medical Care",
             "content": "Seek emergency care if you experience: severe bleeding, sudden severe swelling in the face or hands, severe headaches with visual changes, fever over 38°C (100.4°F), or decreased fetal movement.",
             "tags": ["emergency", "danger", "bleeding"]},
            {"category": "Warning Signs", "icon": "⚠️",
             "title": "Signs of Preterm Labor",
             "content": "If you are less than 37 weeks pregnant, watch out for: regular contractions (every 10 minutes or more often), leaking fluid from your vagina, pelvic pressure, or low, dull backache.",
             "tags": ["labor", "preterm", "contractions"]},
            {"category": "Nutrition", "icon": "🥗",
             "title": "Essential Vitamins: Folic Acid and Iron",
             "content": "Folic acid helps prevent neural tube defects. Take 400mcg daily. Iron is crucial for increased blood volume. Iron-rich foods include spinach, lentils, fortified cereals, and lean meats.",
             "tags": ["vitamins", "iron", "folic acid"]},
            {"category": "Nutrition", "icon": "🥗",
             "title": "Foods to Avoid During Pregnancy",
             "content": "Avoid: raw or undercooked meat, unpasteurized milk and cheese, raw sprouts, high-mercury fish (like shark, swordfish), and excess caffeine (limit to 200mg per day).",
             "tags": ["diet", "safety", "avoid"]},
            {"category": "Exercise", "icon": "🧘‍♀️",
             "title": "Safe Exercises for Pregnancy",
             "content": "Aim for 30 minutes of moderate exercise most days. Safe options include brisk walking, swimming, prenatal yoga, and stationary cycling.",
             "tags": ["fitness", "yoga", "walking"]},
            {"category": "Emergency Care", "icon": "🚑",
             "title": "Preparing Your Hospital Bag",
             "content": "Pack your bag by week 36. Include: medical records, ID, comfortable clothes, nursing bras, maternity pads, toiletries, clothes for the baby, and diapers.",
             "tags": ["hospital", "labor", "preparation"]},
            {"category": "Weekly Info", "icon": "📅",
             "title": "First Trimester Overview (Weeks 1-13)",
             "content": "Your baby's major organs are forming. You may experience fatigue, nausea, and tender breasts. Focus on resting and taking your prenatal vitamins.",
             "tags": ["trimester 1", "early pregnancy"]},
            {"category": "Weekly Info", "icon": "📅",
             "title": "Second Trimester Overview (Weeks 14-26)",
             "content": "Often the most comfortable trimester. Nausea usually subsides. You will start feeling the baby move (quickening) around weeks 16-20.",
             "tags": ["trimester 2", "movement"]},
            {"category": "Weekly Info", "icon": "📅",
             "title": "Third Trimester Overview (Weeks 27-40)",
             "content": "Your baby is gaining weight rapidly. You may feel more tired, experience backaches, and have Braxton Hicks contractions.",
             "tags": ["trimester 3", "late pregnancy"]},
        ]
        now = datetime.now(timezone.utc)
        for article in default_articles:
            article["created_at"] = now
            article["updated_at"] = now
        await self.articles.insert_many(default_articles)
        logger.info(f"Seeded {len(default_articles)} guidance articles.")
