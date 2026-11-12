"""Password hashing and login tokens."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.config import settings

COOKIE_NAME = "access_token"
ALGORITHM = "HS256"
GUEST_TOKEN_EXPIRATION = 24 * 60 # guest sessions last one day

# Argon2id: passwords are stored as one-way hashes, never as the password itself (NF1 Security)
password_hasher = PasswordHash.recommended()

# Checked against when an email isn't registered, so a failed login takes the same
# time whether or not the account exists (otherwise timing would reveal who has an account)
DUMMY_HASH = password_hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: uuid.UUID, expire_minutes: int | None = None) -> str:
    minutes = expire_minutes if expire_minutes is not None else settings.access_token_expire_minutes
    expires = datetime.now(UTC) + timedelta(minutes=minutes)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    """Return the user id from a valid, unexpired token, or None if it isn't one."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[ALGORITHM], options={"require": ["sub", "exp"]}
        )
        return uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
