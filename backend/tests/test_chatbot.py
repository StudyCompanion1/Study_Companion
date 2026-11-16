from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.main import app
from app.chatbot import _parse_ai_response

client = TestClient(app)


@pytest.fixture(autouse=True)
def override_current_user():
    """Authenticate chatbot test requests without requiring a real login."""
    app.dependency_overrides[get_current_user] = lambda: MagicMock()
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_chat_returns_ai_reply():
    mock_response = MagicMock()
    mock_response.text = (
        "Photosynthesis converts light energy into chemical energy."
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "app.chatbot.get_gemini_client",
        return_value=mock_client,
    ):
        response = client.post(
            "/api/chat",
            data={
                "message": "What is photosynthesis?",
                "history": "[]",
            },
        )

    assert response.status_code == 200
    assert response.json()["reply"] == (
        "Photosynthesis converts light energy into chemical energy."
    )
    mock_client.models.generate_content.assert_called_once()


def test_chat_rejects_blank_message():
    response = client.post(
        "/api/chat",
        data={
            "message": "   ",
            "history": "[]",
        },
    )

    assert response.status_code == 400
    assert "question" in response.json()["detail"].lower()


def test_chat_rejects_invalid_history():
    response = client.post(
        "/api/chat",
        data={
            "message": "Explain this topic",
            "history": "not valid JSON",
        },
    )

    assert response.status_code == 400
    assert "history" in response.json()["detail"].lower()


def test_chat_rejects_unsupported_file_type():
    response = client.post(
        "/api/chat",
        data={
            "message": "Summarize my notes",
            "history": "[]",
        },
        files=[
            (
                "files",
                ("notes.exe", b"not a study document"),
            )
        ],
    )

    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()


def test_parse_ai_response_with_suggestions():
    """Parse a JSON response containing an answer and suggestions."""

    response_text = """
    {
        "reply": "Photosynthesis converts light energy into chemical energy.",
        "suggestions": [
            "What is chlorophyll?",
            "Where does photosynthesis happen?",
            "What is the role of sunlight?"
        ]
    }
    """

    reply, suggestions = _parse_ai_response(response_text)

    assert reply == "Photosynthesis converts light energy into chemical energy."
    assert len(suggestions) == 3
    assert suggestions[0] == "What is chlorophyll?"
    assert suggestions[1] == "Where does photosynthesis happen?"
    assert suggestions[2] == "What is the role of sunlight?"


def test_parse_ai_response_with_plain_text():
    """Fall back to ordinary text if Gemini does not return JSON."""

    response_text = "Photosynthesis converts light energy into chemical energy."

    reply, suggestions = _parse_ai_response(response_text)

    assert reply == response_text
    assert suggestions == []


def test_parse_ai_response_with_invalid_suggestions():
    """Ignore suggestions when Gemini returns an invalid suggestions field."""

    response_text = """
    {
        "reply": "Photosynthesis is how plants make food.",
        "suggestions": "This should be a list."
    }
    """

    reply, suggestions = _parse_ai_response(response_text)

    assert reply == "Photosynthesis is how plants make food."
    assert suggestions == []