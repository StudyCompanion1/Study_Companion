# Cleanup for guest accounts
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, delete

from app.auth.security import GUEST_TOKEN_EXPIRATION
from app.models import User, UserRole

# Extra time past token expiry before deleting, so a guest is never removed while still active
CLEANUP_MARGIN = timedelta(hours=1)

def delete_expired_guests(session: Session) -> int:
    # Delete guests when their login has already expired. Return the amount deleted.
    cutoff = datetime.now(UTC) - timedelta(minutes = GUEST_TOKEN_EXPIRATION) - CLEANUP_MARGIN
    result = session.exec(delete(User).where(User.role == UserRole.GUEST, User.created_at < cutoff))
    session.commit()

    return result.rowcount