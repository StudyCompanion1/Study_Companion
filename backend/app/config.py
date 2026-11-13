"""App settings, read from environment variables or backend/.env (see .env.example)."""

import logging
import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    # Local SQLite file for now; TI-1 will point this at the AWS RDS Postgres instance
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'study_companion.db').as_posix()}"

    # Signs login tokens. Must be set anywhere more than one person relies on the server
    secret_key: str = ""
    access_token_expire_minutes: int = 60 * 24
    # True once the site is served over HTTPS (staging/production); must be False for http://localhost
    cookie_secure: bool = False


settings = Settings()

if not settings.secret_key:
    if settings.cookie_secure:
        raise RuntimeError("SECRET_KEY must be set when COOKIE_SECURE is true (staging/production)")
    settings.secret_key = secrets.token_urlsafe(32)
    logger.warning(
        "SECRET_KEY is not set, so a random one is being used and everyone is logged out "
        "whenever the server restarts. Copy backend/.env.example to backend/.env to fix this."
    )
