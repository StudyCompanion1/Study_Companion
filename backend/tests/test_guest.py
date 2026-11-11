# Guest login tests
from app.auth.security import COOKIE_NAME

from datetime import UTC, datetime, timedelta
from sqlmodel import select
from app.models import User, UserRole

from app.auth.security import GUEST_TOKEN_EXPIRATION
from app.auth.guests import CLEANUP_MARGIN, delete_expired_guests


def start_guest(client):
    return client.post("/api/auth/guest")

def test_guest_creates_guest_account_and_login(client):
    res = start_guest(client)

    assert res.status_code == 201
    user = res.json()
    assert user["name"] == "Guest"
    assert user["role"] == "guest"
    assert set(user) == {"id", "name", "email", "role", "created_at"}

    me = client.get("/api/auth/me").json()
    assert me["id"] == user["id"]
    assert me ["role"] == "guest"

def test_guest_cookie_is_httponly(client):
    cookie = start_guest(client).headers["set-cookie"].lower()

    assert cookie.startswith(f"{COOKIE_NAME}=")
    assert "httponly" in cookie
    assert "samesite=lax" in cookie

def test_guest_each_is_separate_account(client):
    first = start_guest(client).json()
    client.cookies.clear()
    second = start_guest(client).json()

    assert first["id"] != second["id"]
    assert first["email"] != second["email"]

def test_guest_can_logout(client):
    start_guest(client)

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401

def test_guest_nobody_logs_into_guest_account_with_password(client):
      email = start_guest(client).json()["email"]
      client.cookies.clear()

      res = client.post("/api/auth/login", json={"email": email, "password": "anything-at-all"})

      assert res.status_code in (401, 422) # 422 = placeholder email fails validation, otherwise 401 (never 200)
      assert client.get("/api/auth/me").status_code == 401

def add_user(session, role, age, email):
    session.add(User(name="Test", email=email, password_hash="not-a-real-hash", role=role, created_at=datetime.now(UTC) - age,))
    session.commit()

def test_guest_cookie_lasts_oneday(client):
    cookie = start_guest(client).headers["set-cookie"].lower()
    assert f"max-age={GUEST_TOKEN_EXPIRATION * 60}" in cookie

def test_guest_expired_cleanup_deletion(session):
    expired = timedelta(minutes = GUEST_TOKEN_EXPIRATION) + CLEANUP_MARGIN + timedelta(hours = 1)
    add_user(session, UserRole.GUEST, expired, "old-guest@guest.invalid")
    add_user(session, UserRole.GUEST, timedelta(minutes = 5), "new-guest@guest.invalid")
    add_user(session, UserRole.STUDENT, expired, "old-student@example.com")

    deleted = delete_expired_guests(session)

    session.expire_all()
    remaining = {user.email for user in session.exec(select(User)).all()}
    assert deleted == 1
    assert remaining == {"new-guest@guest.invalid", "old-student@example.com"}

def test_guest_cleanup_token_could_still_be_valid(session):
    add_user(session, UserRole.GUEST, timedelta(minutes = GUEST_TOKEN_EXPIRATION + 30), "recent@guest.invalid")
    assert delete_expired_guests(session) == 0