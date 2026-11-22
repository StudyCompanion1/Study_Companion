# Cleanup for guest accounts, allows for usage of features for limited amount of uses before a prompt for account creation
# and the features are disabled until the user creates an account. 
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlmodel import Session, delete, func, select

from app.auth.security import GUEST_TOKEN_EXPIRATION
from app.config import settings
from app.models import Collection, CourseMaterial, Note, User, UserRole
from app.models.chatbot_preferences import ChatbotPreferences
from app.storage import delete_user_files

# Extra time past token expiry before deleting, so a guest is never removed while still active
CLEANUP_MARGIN = timedelta(hours=1)
CLEANUP_BATCH = 500 # ids per delete

LIMIT_MESSAGES = {
    "guest_chats_used": "You've used up all of your free questions. Create a free account to keep chatting.",
    "guest_uploads_used": "You've used up all of your free uploads. Create a free account to upload more files.",
}

def is_guest(user: User) -> bool:
    return user.role == UserRole.GUEST

# Uses up a usage from guest's total allowed uploads/chats, or raises 403 if there are none remaining.
# Does nothing for registered users.
def usage_for_guest(session: Session, user: User, field: str, amount: int, limit: int) -> None:
    if not is_guest(user):
        return # exits if account isn't a guest account

    used = getattr(User, field)
    result = session.exec(update(User).where(User.id == user.id, used + amount <= limit).values({field: used + amount}))
    session.commit()

    if result.rowcount != 1:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=LIMIT_MESSAGES[field])

# Gives the usage back if the reqest fails, errors shouldn't be charged a usage.
def refund_guest_usage(session: Session, user: User, field: str, amount: int) -> None:
    if not is_guest(user):
        return

    session.rollback() # A failed request can leave the session mid-transaction.
    used = getattr(User, field)
    session.exec(update(User).where(User.id == user.id, used >= amount).values({field: used - amount}))
    session.commit()

def count_collections_guest(session: Session, user: User) -> int:
    return session.exec(select(func.count()).select_from(Collection).where(Collection.user_id == user.id)).one()

# Raises a 403 error when a guest has reached the collection limit (4)
def check_count_collections_guest(session: Session, user: User) -> None:
    if is_guest(user) and count_collections_guest(session, user) >= settings.guest_max_collections:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"Guests can create up to {settings.guest_max_collections} collections. Create a free account to have more collections.")
    
def delete_expired_guests(session: Session) -> int:
    # Delete guests when their login has already expired. Return the amount deleted.
    cutoff = datetime.now(UTC) - timedelta(minutes = GUEST_TOKEN_EXPIRATION) - CLEANUP_MARGIN
    expired = list(session.exec(select(User.id).where(User.role == UserRole.GUEST, User.created_at < cutoff)).all())

    for start in range(0, len(expired), CLEANUP_BATCH):
        ids = expired[start : start + CLEANUP_BATCH]

        for user_id in ids:
            delete_user_files(user_id)

        # Child rows first. SQLite doesn't enforce on delete cascade
        for model in (Note, CourseMaterial, Collection, ChatbotPreferences):
            session.exec(delete(model).where(model.user_id.in_(ids)))

        session.exec(delete(User).where(User.id.in_(ids)))
        session.commit()

    return len(expired)