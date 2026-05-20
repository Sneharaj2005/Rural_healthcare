"""
Centralised logger utility.

Usage:
    from app.utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Server started", extra={"port": 8000})

Produces structured JSON logs in production and coloured text in development.
"""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any


# ── JSON formatter ────────────────────────────────────────────────────────────
class JSONFormatter(logging.Formatter):
    """Emit each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Merge any extra fields passed via `extra={}`
        for key, value in record.__dict__.items():
            if key not in (
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "module", "msecs", "message", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName",
            ):
                log_obj[key] = value

        return json.dumps(log_obj, default=str)


# ── Coloured text formatter (dev) ─────────────────────────────────────────────
LEVEL_COLOURS = {
    "DEBUG":    "\033[36m",   # cyan
    "INFO":     "\033[32m",   # green
    "WARNING":  "\033[33m",   # yellow
    "ERROR":    "\033[31m",   # red
    "CRITICAL": "\033[35m",   # magenta
}
RESET = "\033[0m"


class ColourFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        colour = LEVEL_COLOURS.get(record.levelname, "")
        ts = datetime.now().strftime("%H:%M:%S")
        return (
            f"{colour}[{record.levelname:<8}]{RESET} "
            f"\033[90m{ts}\033[0m "
            f"\033[1m{record.name}\033[0m — "
            f"{record.getMessage()}"
        )


# ── Factory ───────────────────────────────────────────────────────────────────
def get_logger(name: str) -> logging.Logger:
    """
    Return a configured logger for the given module name.
    Format is determined by the LOG_FORMAT env var (json | text).
    """
    # Lazy import to avoid circular dependency at module load time
    try:
        from app.config.settings import settings
        level_name = settings.LOG_LEVEL.upper()
        use_json   = settings.LOG_FORMAT == "json" and settings.is_production
    except Exception:
        level_name = "INFO"
        use_json   = False

    logger = logging.getLogger(name)

    if logger.handlers:
        return logger   # already configured

    level = getattr(logging, level_name, logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(JSONFormatter() if use_json else ColourFormatter())
    logger.addHandler(handler)
    logger.propagate = False

    return logger


# ── Root app logger ───────────────────────────────────────────────────────────
logger = get_logger("rhc")
