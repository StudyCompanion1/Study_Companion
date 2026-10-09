from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie

from app.auth.security import COOKIE_NAME, decode_access_token
from app.db import SessionDep
from app.models import User

login_cookie = APIKeyCookie(name=COOKIE_NAME, auto_error=False)


def get_current_user(session: SessionDep, token: Annotated[str | None, Depends(login_cookie)]) -> User:
    """Return the logged-in user from the login cookie, or respond 401 Unauthorized."""
    user_id = decode_access_token(token) if token else None
    user = session.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="You are not logged in.")
    return user


# Add `user: CurrentUser` to any route that needs a logged-in user, then use user.id to tie
# uploads, preferences, notes, etc. to the account (DA-4, UX-2)
CurrentUser = Annotated[User, Depends(get_current_user)]
