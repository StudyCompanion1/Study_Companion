"""DA-2 Authentication & Login: register, log in, log out, and check who is logged in.

A successful register or login sets an HttpOnly cookie holding a signed token, and the
browser sends it with every later request automatically.
"""

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.auth.dependencies import CurrentUser
from app.auth.schemas import LoginRequest, RegisterRequest, UserPublic
from app.auth.security import COOKIE_NAME, DUMMY_HASH, create_access_token, hash_password, verify_password
from app.config import settings
from app.db import SessionDep
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_OPTIONS = {
    "httponly": True,  # page JavaScript can't read it, so an injected script can't steal the login
    "samesite": "lax",  # not sent on form posts from other sites, which blocks cross-site request forgery
    "secure": settings.cookie_secure,
    "path": "/",
}


def set_login_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(user.id),
        max_age=settings.access_token_expire_minutes * 60,
        **COOKIE_OPTIONS,
    )


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: SessionDep, response: Response) -> User:
    """Create an account and log the new user in."""
    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError:  # the email column is unique
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    session.refresh(user)
    set_login_cookie(response, user)
    return user


@router.post("/login", response_model=UserPublic)
def login(body: LoginRequest, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.email == body.email)).first()
    password_ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not password_ok:
        # Same message either way, so the response doesn't reveal which emails have accounts
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")
    set_login_cookie(response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, **COOKIE_OPTIONS)


@router.get("/me", response_model=UserPublic)
def me(user: CurrentUser) -> User:
    """The logged-in user, or 401 if nobody is logged in."""
    return user
