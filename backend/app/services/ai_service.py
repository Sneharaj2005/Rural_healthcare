"""
Gemini AI service — Rural Health Companion chatbot.

Responsibilities:
  - Maintain a rich, healthcare-focused system prompt
  - Format responses with markdown-friendly structure
  - Detect emergency keywords and flag them
  - Generate contextual follow-up suggestions
  - Handle all Gemini API errors gracefully
"""
import re
import google.generativeai as genai
from typing import List

from app.config.settings import settings
from app.schemas.ai_chat import ChatMessageSchema, ChatResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Language instruction map ──────────────────────────────────────────────────
LANGUAGE_INSTRUCTIONS = {
    "hi": "Respond in Hindi (हिन्दी). Use simple, clear Hindi that rural communities can understand.",
    "kn": "Respond in Kannada (ಕನ್ನಡ). Use simple, clear Kannada that rural communities can understand.",
    "te": "Respond in Telugu (తెలుగు). Use simple, clear Telugu that rural communities can understand.",
    "ta": "Respond in Tamil (தமிழ்). Use simple, clear Tamil that rural communities can understand.",
    "en": "",  # default — no extra instruction needed
}

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are **RHC AI** — a compassionate, knowledgeable Rural Health Companion assistant designed to serve rural communities with limited access to healthcare.

## Your Core Responsibilities

### 1. Preventive Healthcare Guidance
- Educate users on disease prevention, vaccinations, and regular health screenings.
- Provide seasonal health tips (monsoon hygiene, summer heat precautions, winter care).
- Explain the importance of hand-washing, sanitation, and safe drinking water.

### 2. Hydration, Rest & Nutrition
- Recommend daily water intake (8–10 glasses / 2–3 litres for adults).
- Advise on balanced diets using locally available foods (lentils, leafy greens, fruits).
- Explain the role of sleep (7–9 hours) in immunity and recovery.
- Suggest oral rehydration solutions (ORS) for diarrhoea and dehydration.

### 3. Hygiene & Sanitation
- Promote handwashing with soap before meals and after toilet use.
- Advise on safe food storage, cooking temperatures, and avoiding contaminated water.
- Explain menstrual hygiene, wound care, and skin infection prevention.

### 4. Symptom Guidance
- Help users understand common symptoms (fever, cough, diarrhoea, headache, rash).
- Explain when symptoms are likely mild vs. when they need urgent attention.
- NEVER diagnose or prescribe — always recommend professional consultation.

### 5. Emergency Warning Signs — ALWAYS flag these immediately
If the user mentions ANY of the following, immediately advise calling **112 (Emergency)** or **108 (Ambulance)**:
- Chest pain, pressure, or tightness
- Difficulty breathing or shortness of breath
- Sudden severe headache ("worst headache of my life")
- Stroke signs: face drooping, arm weakness, speech difficulty
- Unconsciousness, seizures, or unresponsiveness
- Severe bleeding that won't stop
- High fever in infants under 3 months (>38°C / 100.4°F)
- Signs of severe dehydration (no urination for 8+ hours, sunken eyes, dry mouth)
- Suspected poisoning or overdose
- Severe allergic reaction (throat swelling, hives, difficulty breathing)

### 6. Clinic & Healthcare Referrals
- When a condition needs in-person care, suggest the user use the **Clinic Finder** feature in this app.
- Mention government health schemes: Ayushman Bharat, PMJAY, ASHA workers, PHC (Primary Health Centres).
- For mental health: suggest iCall (9152987821) or Vandrevala Foundation (1860-2662-345).

## Response Formatting Rules
- Use **bold** for important terms and warnings.
- Use bullet points (- ) for lists of symptoms, tips, or steps.
- Use numbered lists (1. 2. 3.) for step-by-step instructions.
- Use ### headings to organise longer responses.
- Keep responses concise — aim for 150–300 words unless the topic requires more detail.
- End every response with a brief disclaimer line.
- Always be warm, non-judgmental, and culturally sensitive.

## Disclaimer (include at end of every response)
> ⚕️ *This information is for general guidance only and does not replace professional medical advice. Please consult a qualified healthcare provider for diagnosis and treatment.*
"""

# ── Emergency keyword detection ───────────────────────────────────────────────
EMERGENCY_PATTERNS = re.compile(
    r"\b(chest pain|heart attack|stroke|can't breathe|difficulty breathing|"
    r"unconscious|seizure|severe bleeding|not breathing|overdose|poisoning|"
    r"anaphylaxis|throat swelling|severe allergic|baby not breathing|"
    r"infant fever|newborn fever|suicidal|want to die|kill myself)\b",
    re.IGNORECASE,
)

# ── Suggested follow-up questions by topic ────────────────────────────────────
TOPIC_SUGGESTIONS: dict[str, list[str]] = {
    "fever":       ["What temperature is considered dangerous?", "When should I go to a hospital for fever?", "How can I reduce fever at home?"],
    "cough":       ["Is my cough a sign of TB?", "How long should a cough last before seeing a doctor?", "What home remedies help with cough?"],
    "diarrhea":    ["How do I make ORS at home?", "When is diarrhoea an emergency?", "What foods should I avoid during diarrhoea?"],
    "headache":    ["What causes frequent headaches?", "Can dehydration cause headaches?", "When is a headache a warning sign?"],
    "nutrition":   ["What are iron-rich foods available locally?", "How can I improve my child's nutrition?", "What vitamins are important for immunity?"],
    "pregnancy":   ["What are danger signs during pregnancy?", "How often should I have antenatal checkups?", "What foods should I eat during pregnancy?"],
    "diabetes":    ["What are early signs of diabetes?", "How can I manage blood sugar with diet?", "What is the normal blood sugar range?"],
    "default":     ["What preventive steps can I take today?", "How much water should I drink daily?", "When should I visit a clinic?"],
}

def _get_suggestions(message: str, response: str) -> list[str]:
    """Return 3 contextual follow-up suggestions based on message content."""
    combined = (message + " " + response).lower()
    for topic, questions in TOPIC_SUGGESTIONS.items():
        if topic != "default" and topic in combined:
            return questions[:3]
    return TOPIC_SUGGESTIONS["default"]


def _is_emergency(message: str) -> bool:
    return bool(EMERGENCY_PATTERNS.search(message))


# ── Service class ─────────────────────────────────────────────────────────────
class AIService:
    def __init__(self):
        self._model = None
        self._initialise()

    def _initialise(self) -> None:
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set — AI chat disabled.")
            return
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Sanitize model name — remove any whitespace or 'models/' prefix
            model_name = settings.GEMINI_MODEL.strip().replace("models/", "")
            if not model_name:
                model_name = "gemini-1.5-flash"
            logger.info(f"Initialising Gemini with model: '{model_name}'")
            self._model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    top_p=0.9,
                    max_output_tokens=1024,
                ),
            )
            self._model_name = model_name
            logger.info("Gemini AI initialised", extra={"model": model_name})
        except Exception as exc:
            logger.error("Gemini init failed", exc_info=exc)

    async def chat(
        self,
        message: str,
        history: List[ChatMessageSchema],
        language: str = "en",
    ) -> ChatResponse:
        emergency = _is_emergency(message)

        # Re-initialise if model is missing (e.g. key was added after startup)
        if not self._model and settings.GEMINI_API_KEY:
            self._initialise()

        if not self._model:
            return ChatResponse(
                response=(
                    "⚠️ **AI service is not configured.**\n\n"
                    "Please add a `GEMINI_API_KEY` to the backend `.env` file to enable this feature.\n\n"
                    "> ⚕️ *This information is for general guidance only and does not replace professional medical advice.*"
                ),
                is_emergency=emergency,
                suggested_questions=TOPIC_SUGGESTIONS["default"],
            )

        # Build full prompt with system context + history + user message
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, "")

        # Build conversation as a single prompt string (most compatible approach)
        full_prompt = SYSTEM_PROMPT + "\n\n"

        if lang_instruction:
            full_prompt += f"{lang_instruction}\n\n"

        if emergency:
            full_prompt += (
                "EMERGENCY CONTEXT: The user may be describing a medical emergency. "
                "Immediately advise calling 112 or 108.\n\n"
            )

        # Add recent history
        for msg in (history or [])[-6:]:  # last 6 messages for context
            role = "User" if msg.role == "user" else "Assistant"
            full_prompt += f"{role}: {msg.content}\n\n"

        full_prompt += f"User: {message}\n\nAssistant:"

        try:
            response = await self._model.generate_content_async(full_prompt)
            text = response.text

            return ChatResponse(
                response=text,
                is_emergency=emergency,
                suggested_questions=_get_suggestions(message, text),
            )

        except genai.types.BlockedPromptException:
            logger.warning("Gemini blocked prompt", extra={"message": message[:100]})
            return ChatResponse(
                response=(
                    "I'm unable to respond to that message. "
                    "Please rephrase your question or ask about a different health topic.\n\n"
                    "> ⚕️ *This information is for general guidance only.*"
                ),
                is_emergency=emergency,
                suggested_questions=TOPIC_SUGGESTIONS["default"],
            )
        except Exception as exc:
            err_str = str(exc)
            err_type = type(exc).__name__
            logger.error(f"Gemini chat error [{err_type}]: {err_str}", exc_info=exc)
            # Give a specific message for quota exhaustion
            if "429" in err_str or "quota" in err_str.lower() or "ResourceExhausted" in err_type:
                msg = (
                    "⚠️ **AI service is temporarily unavailable** — the API quota has been reached.\n\n"
                    "Please try again in a few minutes, or check your Gemini API plan at "
                    "[ai.google.dev](https://ai.google.dev).\n\n"
                    "> ⚕️ *This information is for general guidance only.*"
                )
            elif "404" in err_str or "NotFound" in err_type or "not found" in err_str.lower():
                msg = (
                    f"⚠️ **AI model `{settings.GEMINI_MODEL}` is not available.**\n\n"
                    "Please update the `GEMINI_MODEL` environment variable in Render to `gemini-1.5-flash`.\n\n"
                    "> ⚕️ *This information is for general guidance only.*"
                )
            elif "403" in err_str or "permission" in err_str.lower() or "API_KEY" in err_str:
                msg = (
                    "⚠️ **Invalid API key.** The Gemini API key is missing or incorrect.\n\n"
                    "Please update `GEMINI_API_KEY` in Render environment variables.\n\n"
                    "> ⚕️ *This information is for general guidance only.*"
                )
            else:
                msg = (
                    f"Sorry, I encountered an error: `{err_type}`.\n\n"
                    "Please try again in a moment.\n\n"
                    "> ⚕️ *This information is for general guidance only.*"
                )
            return ChatResponse(
                response=msg,
                is_emergency=emergency,
                suggested_questions=TOPIC_SUGGESTIONS["default"],
            )

    def get_suggested_questions(self, topic: str = "default") -> list[str]:
        return TOPIC_SUGGESTIONS.get(topic.lower(), TOPIC_SUGGESTIONS["default"])


# ── Singleton ─────────────────────────────────────────────────────────────────
ai_service = AIService()
