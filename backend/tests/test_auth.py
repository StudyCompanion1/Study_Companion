"""DA-2 Implement Authentication & Login (GUS-2), grouped by acceptance criterion. QA test case TC-003."""

import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.auth.security import COOKIE_NAME, create_access_token
from app.config import settings
from app.main import app
from app.models import User

PASSWORD = "correct-horse-battery"


def register(client, email="maya@example.com", password=PASSWORD, name="Maya"):
    return client.post("/api/auth/register", json={"name": name, "email": email, "password": password})


def login(client, email="maya@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


# AC1: A user can register and log in; passwords are encrypted at rest (NF1 Security)


def test_register_creates_account_and_logs_in(client):
    res = register(client)

    assert res.status_code == 201
    user = res.json()
    assert user["name"] == "Maya"
    assert user["email"] == "maya@example.com"
    assert user["role"] == "student"
    assert set(user) == {"id", "name", "email", "role", "created_at"}  # no password hash in responses
    assert user["created_at"].endswith("Z")  # marked as UTC so browsers don't read it as local time
    assert client.get("/api/auth/me").json()["id"] == user["id"]


def test_password_is_stored_as_argon2_hash(client, session):
    register(client)

    stored = session.exec(select(User)).one()
    assert PASSWORD not in stored.password_hash
    assert stored.password_hash.startswith("$argon2id$")


def test_registered_user_can_log_in(client):
    register(client)
    client.cookies.clear()

    res = login(client)

    assert res.status_code == 200
    assert res.json()["email"] == "maya@example.com"
    assert client.get("/api/auth/me").status_code == 200


def test_email_is_case_insensitive(client):
    register(client, email="Maya@Example.com")
    client.cookies.clear()

    assert register(client, email="MAYA@example.COM").status_code == 409
    assert login(client, email="mAyA@eXample.com").status_code == 200


def test_register_rejects_duplicate_email(client):
    register(client)

    res = register(client, name="Someone Else")

    assert res.status_code == 409
    assert res.json()["detail"] == "An account with this email already exists."


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Maya", "email": "not-an-email", "password": PASSWORD},
        {"name": "Maya", "email": "maya@example.com", "password": "short"},
        {"name": "Maya", "email": "maya@example.com", "password": "x" * 129},
        {"name": "   ", "email": "maya@example.com", "password": PASSWORD},
        {"email": "maya@example.com", "password": PASSWORD},
    ],
    ids=["bad email", "short password", "huge password", "blank name", "missing name"],
)
def test_register_rejects_invalid_input(client, body):
    assert client.post("/api/auth/register", json=body).status_code == 422


def test_register_cannot_choose_own_role(client):
    res = client.post(
        "/api/auth/register",
        json={"name": "Maya", "email": "maya@example.com", "password": PASSWORD, "role": "admin"},
    )

    assert res.json()["role"] == "student"


# AC2: A session or token is issued and login state is maintained across requests


def test_login_sets_httponly_samesite_cookie(client):
    register(client)
    client.cookies.clear()

    cookie = login(client).headers["set-cookie"].lower()

    assert cookie.startswith(f"{COOKIE_NAME}=")
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert f"max-age={settings.access_token_expire_minutes * 60}" in cookie


def test_login_state_lasts_across_requests(client):
    user_id = register(client).json()["id"]

    for _ in range(3):
        assert client.get("/api/auth/me").json()["id"] == user_id


def test_me_without_login_is_rejected(client):
    res = client.get("/api/auth/me")

    assert res.status_code == 401
    assert res.json()["detail"] == "You are not logged in."


def test_logout_ends_the_session(client):
    register(client)

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_expired_token_is_rejected(client, monkeypatch):
    user_id = uuid.UUID(register(client).json()["id"])
    monkeypatch.setattr(settings, "access_token_expire_minutes", -1)
    client.cookies.set(COOKIE_NAME, create_access_token(user_id))

    assert client.get("/api/auth/me").status_code == 401


def test_forged_token_is_rejected(client):
    user_id = register(client).json()["id"]
    forged = jwt.encode({"sub": user_id, "exp": 9999999999}, "a-guessed-secret-key-of-32-bytes", algorithm="HS256")
    client.cookies.set(COOKIE_NAME, forged)

    assert client.get("/api/auth/me").status_code == 401


def test_garbage_token_is_rejected(client):
    client.cookies.set(COOKIE_NAME, "not-a-token")

    assert client.get("/api/auth/me").status_code == 401


def test_token_for_deleted_account_is_rejected(client, session):
    register(client)
    session.delete(session.exec(select(User)).one())
    session.commit()

    assert client.get("/api/auth/me").status_code == 401


# AC3: Uploaded files and preferences are associated with the logged-in account
# (CurrentUser is what DA-4 uploads and UX-2 preferences will use to find the account)


def test_each_login_identifies_its_own_account(client):
    other_browser = TestClient(app)
    maya = register(client).json()
    sam = register(other_browser, email="sam@example.com", name="Sam").json()

    assert client.get("/api/auth/me").json()["id"] == maya["id"]
    assert other_browser.get("/api/auth/me").json()["id"] == sam["id"]


# AC4: Invalid credentials return a clear, handled error


def test_wrong_password_is_rejected(client):
    register(client)
    client.cookies.clear()

    res = login(client, password="wrong-password")

    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password."
    assert COOKIE_NAME not in res.cookies


def test_unknown_email_gets_the_same_error(client):
    res = login(client, email="nobody@example.com")

    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password."
