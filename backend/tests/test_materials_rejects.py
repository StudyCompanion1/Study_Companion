"""F1: uploads that must be refused (app/materials/router.py and temp_file.py)."""

from unittest.mock import patch

from sqlmodel import select

from app.materials import temp_file
from app.models import CourseMaterial
from tests.materials_helpers import MATERIALS, UPLOAD_FILE, pdf, register


def test_upload_rejects_unsupported_type(client, session):
    register(client)

    with patch(UPLOAD_FILE) as mock_upload:
        res = client.post(MATERIALS, files=pdf("virus.exe", b"MZ", "application/octet-stream"))

    assert res.status_code == 400
    assert "isn't supported" in res.json()["detail"]
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []


def test_upload_rejects_empty_file(client):
    register(client)

    with patch(UPLOAD_FILE) as mock_upload:
        res = client.post(MATERIALS, files=pdf(content=b""))

    assert res.status_code == 400
    assert res.json()["detail"] == "This file is empty."
    mock_upload.assert_not_called()


def test_upload_rejects_file_over_limit(client, session, monkeypatch):
    register(client)
    monkeypatch.setattr(temp_file, "MAX_UPLOAD_BYTES", 10)  # small limit so the test stays fast
    monkeypatch.setattr(temp_file, "CHUNK_BYTES", 4)

    with patch(UPLOAD_FILE) as mock_upload:
        res = client.post(MATERIALS, files=pdf(content=b"x" * 11))

    assert res.status_code == 413
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []
