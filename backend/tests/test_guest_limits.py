# Guest Limits: Limited amounts of AI chats and uploads, as well as a collections cap. 
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import select

from app.auth.guests import CLEANUP_MARGIN, delete_expired_guests
from app.auth.security import GUEST_TOKEN_EXPIRATION
from app.config import settings
from app.models import Collection, CourseMaterial, FileType, User, UserRole
from tests.materials_helpers import MATERIALS, UPLOAD_FILE, pdf, register

def start_guest(client):
    return client.post("/api/auth/guest")


def chat(client, files=None):
    return client.post("/api/chat", data={"message": "What is photosynthesis?", "history": "[]"}, files=files)

def usage(client):
    return client.get("/api/auth/usage").json()


@pytest.fixture
# Replace Gemini so no test spends tokens.
def gemini():
    response = MagicMock()
    response.text = "A short answer."
    mock = MagicMock()
    mock.models.generate_content.return_value = response
    with patch("app.chatbot.get_gemini_client", return_value = mock):
        yield mock

# Chatbot
def test_guest_chat_is_limited(client, gemini):
    start_guest(client)

    for _ in range(settings.guest_max_chats):
        assert chat(client).status_code == 200
    
    res = chat(client)

    assert res.status_code == 403
    assert "free account" in res.json()["detail"]
    assert gemini.models.generate_content.call_count == settings.guest_max_chats  # No Gemini call once locked.

def test_failed_chat_not_charged_to_guest(client, gemini):
    response = gemini.models.generate_content.return_value
    gemini.models.generate_content.side_effect = [Exception("boom"), response, response]
    start_guest(client)

    assert chat(client).status_code == 502
    assert usage(client)["chats_remaining"] == settings.guest_max_chats
    assert chat(client).status_code == 200
    assert chat(client).status_code == 200

def test_guest_uploads_one_file_only(client, gemini):
    start_guest(client)
    one = [("files", ("a.txt", b"alpha", "text/plain"))]
    two = one + [("files", ("b.txt", b"beta", "text/plain"))]

    too_many = chat(client, files=two)

    assert too_many.status_code == 400
    assert "1 file" in too_many.json()["detail"]
    assert usage(client)["chats_remaining"] == settings.guest_max_chats # Rejected messages aren't counted towards usage
    assert chat(client, files = one).status_code == 200

def test_registered_users_chat_not_limited(client, gemini):
    register(client)

    for _ in range(settings.guest_max_chats + 2):
        assert chat(client).status_code == 200

# Uploads
def test_guest_upload_is_limited(client):
    start_guest(client)

    with patch(UPLOAD_FILE):
        for _ in range(settings.guest_max_uploads):
            assert client.post(MATERIALS, files=pdf()).status_code == 201
        
        res = client.post(MATERIALS, files=pdf())

    assert res.status_code == 403
    assert "free account" in res.json()["detail"]

def test_rejected_uploads_not_charged_to_guest(client):
    start_guest(client)

    empty = client.post(MATERIALS, files = pdf(content=b"")) # Rejected due to file being empty.

    assert empty.status_code == 400
    assert usage(client)["uploads_remaining"] == settings.guest_max_uploads
    
    with patch(UPLOAD_FILE):
        for _ in range(settings.guest_max_uploads):
            assert client.post(MATERIALS, files=pdf()).status_code == 201

def test_registered_users_uploads_not_limited(client):
    register(client)

    with patch(UPLOAD_FILE):
        for _ in range(settings.guest_max_uploads + 1):
            assert client.post(MATERIALS, files=pdf()).status_code == 201

# Collections
def test_guest_collections_are_limited(client):
    start_guest(client)

    for number in range(settings.guest_max_collections):
        assert client.post("/api/collections", json={"name": f"Course {number}"}).status_code == 201
    res = client.post("/api/collections", json={"name": "One too many"})

    assert res.status_code == 403
    assert "collections" in res.json()["detail"]

# Usage
def test_usage_goes_down_for_guest(client):
    start_guest(client)
    assert usage(client) == {
        "is_guest": True,
        "chats_remaining": settings.guest_max_chats,
        "uploads_remaining": settings.guest_max_uploads,
        "collections_remaining": settings.guest_max_collections,
    }

    with patch(UPLOAD_FILE):
        client.post(MATERIALS, files=pdf())

    assert usage(client)["uploads_remaining"] == settings.guest_max_uploads - 1

def test_usage_no_limits_for_registered_user(client):
    register(client)

    assert usage(client) == {
        "is_guest": False,
        "chats_remaining": None,
        "uploads_remaining": None,
        "collections_remaining": None,
    }

# AI study tools (registered users only)

NOTES = {"file": ("notes.txt", b"hello", "text/plain")}

@pytest.mark.parametrize("route", ["/api/analyze", "/api/study-guide"])
def test_study_tools_reject_guests(client, route):
    assert client.post(route, files=NOTES).status_code == 401
    start_guest(client)
    assert client.post(route, files=NOTES).status_code == 403

def test_registered_user_use_study_tools(client):
    register(client)

    with patch("app.main.analyze_pdf", return_value="notes"):
        res = client.post("/api/analyze", files=NOTES)

    assert res.status_code == 200
    assert res.json() == {"result": "notes"}

def test_url_resources_only_registered_users(client):
    assert client.post("/api/url-resources?query=biology").status_code == 401
    start_guest(client)
    assert client.post("/api/url-resources?query=biology").status_code == 403

# Cleanup
def test_cleanup_removes_expired_guest_content(session):
    expired = timedelta(minutes=GUEST_TOKEN_EXPIRATION) + CLEANUP_MARGIN + timedelta(hours=1)
    session.add(User(name="Guest", email="old@guest.invalid", password_hash="x", role=UserRole.GUEST,
                     created_at=datetime.now(UTC) - expired))
    session.commit()
    guest_id = session.exec(select(User)).one().id
    collection = Collection(user_id=guest_id, name="Biology")
    session.add(collection)
    session.commit()
    session.add(CourseMaterial(user_id=guest_id, collection_id=collection.id, title="Week 1",
                               file_type=FileType.PDF, file_path="users/x/y.pdf"))
    session.commit()

    with patch("app.auth.guests.delete_user_files") as delete_files:
        deleted = delete_expired_guests(session)

    session.expire_all()
    assert deleted == 1
    delete_files.assert_called_once_with(guest_id)
    assert session.exec(select(User)).all() == []
    assert session.exec(select(Collection)).all() == []
    assert session.exec(select(CourseMaterial)).all() == []

def test_failed_cleanup_doesnt_stop_guest_login(client):
    with patch("app.auth.router.delete_expired_guests", side_effect=RuntimeError("boom")):
        res = client.post("/api/auth/guest")

    assert res.status_code == 201