"""
Async email service using aiosmtplib + Jinja2 HTML templates.
"""
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Jinja2 template environment ───────────────────────────────────────────────
_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render(template_name: str, context: dict) -> str:
    return _jinja.get_template(template_name).render(**context)


class EmailService:
    def __init__(self):
        self._from = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME

    def _is_configured(self) -> bool:
        return bool(
            settings.EMAIL_ENABLED
            and settings.SMTP_USERNAME
            and settings.SMTP_PASSWORD
            and self._from
        )

    async def send(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        plain_body: str = "",
    ) -> bool:
        """Send an HTML email. Returns True on success."""
        if not self._is_configured():
            logger.warning(
                "Email not configured — skipping send.",
                extra={"to": to_email, "subject": subject},
            )
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SMTP_FROM_NAME} <{self._from}>"
        msg["To"]      = to_email

        if plain_body:
            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        use_tls = settings.SMTP_PORT == 465
        start_tls = settings.SMTP_PORT == 587

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                use_tls=use_tls,
                start_tls=start_tls,
            )
            logger.info("Email sent", extra={"to": to_email, "subject": subject})
            return True
        except Exception as exc:
            logger.error("Email send failed", extra={"to": to_email}, exc_info=exc)
            return False

    async def send_vaccination_reminder(
        self,
        to_email: str,
        user_name: str,
        profile_name: str,
        profile_age: str,
        vaccines: List[dict],
        app_url: str = "http://localhost:5173",
    ) -> bool:
        from datetime import date
        html = _render("vaccination_reminder.html", {
            "user_name":    user_name,
            "profile_name": profile_name,
            "profile_age":  profile_age,
            "vaccines":     vaccines,
            "app_url":      app_url,
            "year":         date.today().year,
        })
        plain = (
            f"Hi {user_name},\n\n"
            f"Vaccination reminder for {profile_name} ({profile_age}):\n\n"
            + "\n".join(
                f"- {v['vaccine_name']} Dose {v['dose_number']}: due {v['due_date']} ({v['status']})"
                for v in vaccines
            )
            + f"\n\nView schedule: {app_url}/vaccination\n\n"
            "RHC AI Lite"
        )
        subject = f"💉 Vaccination Reminder — {profile_name}"
        return await self.send(to_email, subject, html, plain)

    async def send_maternal_reminder(
        self,
        to_email: str,
        user_name: str,
        profile_name: str,
        current_week: int,
        visits: List[dict],
        water_needed: bool,
        app_url: str = "http://localhost:5173",
    ) -> bool:
        from datetime import date
        html = _render("maternal_reminder.html", {
            "user_name":    user_name,
            "profile_name": profile_name,
            "current_week": current_week,
            "visits":       visits,
            "water_needed": water_needed,
            "app_url":      app_url,
            "year":         date.today().year,
        })
        plain = (
            f"Hi {user_name},\n\n"
            f"Maternal care update for {profile_name} (Week {current_week}):\n\n"
        )
        if visits:
            plain += "Upcoming Visits:\n"
            for v in visits:
                plain += f"- {v['visit_date']} — {v['visit_type']} ({v.get('hospital', '')})\n"
        if water_needed:
            plain += "\nDon't forget to drink plenty of water today!\n"
            
        plain += f"\nView dashboard: {app_url}/maternal\n\n"
        plain += "RHC AI Lite"
        
        subject = f"👶 Maternal Care Update — Week {current_week}"
        return await self.send(to_email, subject, html, plain)

    async def send_test_email(self, to_email: str) -> bool:
        html = "<h2>✅ RHC AI Lite — Email configured successfully!</h2><p>Your email notifications are working.</p>"
        return await self.send(to_email, "RHC AI Lite — Test Email", html, "Email configured successfully!")


# Singleton
email_service = EmailService()
