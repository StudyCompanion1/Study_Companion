import json
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlmodel import select

from app import chatbot
from app.auth.dependencies import get_current_user
from app.main import app
from app.models.chatbot_preferences import ChatbotPreferences
from app.models.user import User


@pytest.fixture
def chat_user(session):
    user = User(name="Student", email="chat@example.com", password_hash="unused")
    session.add(user)
    session.commit()
    return user


@pytest.fixture
def chat_client(client, chat_user, monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: chat_user
    monkeypatch.setattr(chatbot, "get_gemini_client", Mock(side_effect=AssertionError("Unexpected AI request")))
    return client


@pytest.fixture
def ai_client(monkeypatch):
    client = Mock()
    client.models.generate_content.return_value = SimpleNamespace(text='{"reply":"Explanation","suggestions":["Why?"]}')
    monkeypatch.setattr(chatbot, "get_gemini_client", lambda: client)
    return client


def test_chat_requires_authentication(client):
    assert client.post("/api/chat", data={"message": "Hello"}).status_code == 401


def test_chat_extracts_real_text_attachment_and_includes_history(chat_client, ai_client):
    response = chat_client.post("/api/chat", data={
        "message": "Explain my notes",
        "history": json.dumps([{"role": "user", "content": "Earlier question"}]),
    }, files=[("files", ("biology.txt", b"Mitochondria produce ATP.", "text/plain"))])
    assert response.status_code == 200
    assert response.json() == {"reply": "Explanation", "suggestions": ["Why?"]}
    prompt = ai_client.models.generate_content.call_args.kwargs["contents"]
    assert "<material>\nMitochondria produce ATP.\n</material>" in prompt
    assert "USER: Earlier question" in prompt
    assert "Explain my notes" in prompt


@pytest.mark.parametrize("message,field,expected", [
    ("I prefer shorter answers", "response_length", "concise"),
    ("Going forward use more detail", "response_length", "detailed"),
    ("Please always explain step by step", "use_step_by_step", True),
    ("From now on answer without steps", "use_step_by_step", False),
    ("I prefer you use examples", "use_examples", True),
    ("I prefer answers without examples", "use_examples", False),
    ("I prefer simpler language", "explanation_style", "simple language"),
    ("I prefer a conversational tone", "explanation_style", "conversational"),
])
def test_preferences_are_persisted_and_included_in_prompt(chat_client, session, chat_user, ai_client, message, field, expected):
    if isinstance(expected, bool):
        initial = ChatbotPreferences(user_id=chat_user.id)
        setattr(initial, field, not expected)
        session.add(initial)
        session.commit()
    assert chat_client.post("/api/chat", data={"message": message}).status_code == 200
    preferences = session.exec(select(ChatbotPreferences)).one()
    assert preferences.user_id == chat_user.id
    assert getattr(preferences, field) == expected
    prompt = ai_client.models.generate_content.call_args.kwargs["contents"]
    assert "Saved response preferences" in prompt
    assert str(expected) in prompt


def test_preferences_survive_later_requests_and_do_not_affect_another_user(chat_client, chat_user, session, ai_client):
    chat_client.post("/api/chat", data={"message": "From now on use shorter answers without examples"})
    chat_client.post("/api/chat", data={"message": "Explain photosynthesis"})
    preferences = session.exec(select(ChatbotPreferences)).one()
    assert preferences.response_length == "concise"
    assert preferences.use_examples is False
    assert "Response length: concise" in ai_client.models.generate_content.call_args.kwargs["contents"]
    assert chatbot._update_chatbot_preferences(session, uuid.uuid4(), "Hello") is None


def test_one_off_question_does_not_create_preferences(chat_client, session, ai_client):
    assert chat_client.post("/api/chat", data={"message": "Explain with examples"}).status_code == 200
    assert session.exec(select(ChatbotPreferences)).all() == []


@pytest.mark.parametrize("data,files,status", [
    ({"message": "x" * 4001}, [], 400),
    ({"message": "Hi"}, [("files", (f"{i}.txt", b"x")) for i in range(6)], 400),
    ({"message": "Hi", "history": "{}"}, [], 400),
    ({"message": "Hi", "history": '[{"role":"system","content":"x"}]'}, [], 400),
    ({"message": "Hi", "history": json.dumps([{"role": "user", "content": "x" * 4001}])}, [], 400),
])
def test_invalid_requests_do_not_call_ai(chat_client, data, files, status):
    assert chat_client.post("/api/chat", data=data, files=files).status_code == status
    chatbot.get_gemini_client.assert_not_called()


def test_file_and_combined_size_limits(chat_client, monkeypatch):
    monkeypatch.setattr(chatbot, "MAX_FILE_SIZE", 4)
    monkeypatch.setattr(chatbot, "MAX_TOTAL_FILE_SIZE", 5)
    oversized = chat_client.post("/api/chat", data={"message": "Hi"}, files=[("files", ("a.txt", b"12345"))])
    combined = chat_client.post("/api/chat", data={"message": "Hi"}, files=[
        ("files", ("a.txt", b"123")), ("files", ("b.txt", b"456")),
    ])
    assert oversized.status_code == combined.status_code == 413
    assert "combined" in combined.json()["detail"]
    chatbot.get_gemini_client.assert_not_called()


@pytest.mark.parametrize("result", [None, " ", '{"reply":"  "}'])
def test_empty_ai_reply_is_reported_as_bad_gateway(chat_client, ai_client, result):
    ai_client.models.generate_content.return_value.text = result
    response = chat_client.post("/api/chat", data={"message": "Hi"})
    assert response.status_code == 502
    assert "empty response" in response.json()["detail"]


@pytest.mark.parametrize("error,status", [
    (RuntimeError("GEMINI_API_KEY is not configured"), 503),
    (RuntimeError("private provider details"), 502),
    (ValueError("private provider details"), 502),
])
def test_provider_errors_return_safe_messages(chat_client, monkeypatch, error, status):
    monkeypatch.setattr(chatbot, "get_gemini_client", Mock(side_effect=error))
    response = chat_client.post("/api/chat", data={"message": "Hi"})
    assert response.status_code == status
    assert "private provider details" not in response.text


@pytest.mark.parametrize("error", [None, ValueError("unreadable document")])
def test_attachment_temporary_files_are_removed_on_success_and_failure(monkeypatch, error):
    paths = []

    def extract(filename):
        paths.append(Path(filename))
        assert paths[-1].read_bytes() == b"notes"
        if error:
            raise error
        return "text" * 10

    monkeypatch.setattr(chatbot, "extract_document_text", extract)
    monkeypatch.setattr(chatbot, "MAX_DOCUMENT_CONTEXT", 20)
    if error:
        with pytest.raises(chatbot.HTTPException) as caught:
            chatbot._extract_uploaded_materials([("a.txt", b"notes")])
        assert caught.value.status_code == 400
    else:
        assert len(chatbot._extract_uploaded_materials([("a.txt", b"notes")])) == 20
    assert not paths[0].exists()


def test_history_keeps_only_twenty_most_recent_messages():
    history = [{"role": "user", "content": str(i)} for i in range(25)]
    parsed = chatbot._read_history(json.dumps(history))
    assert [item.content for item in parsed] == [str(i) for i in range(5, 25)]


def test_suggestions_are_filtered_trimmed_and_limited():
    reply, suggestions = chatbot._parse_ai_response(json.dumps({
        "reply": " Answer ", "suggestions": [None, " ", 4, " One? ", "Two?", "Three?", "Four?"],
    }))
    assert reply == "Answer"
    assert suggestions == ["One?", "Two?", "Three?"]
