"""TI-2: uploads require login and are persisted to S3 + CourseMaterial, not just sent to Gemini."""

from unittest.mock import patch

from sqlmodel import select

from app.models import CourseMaterial
from tests.test_auth import register


def _pdf_file():
    return {"file": ("notes.pdf", b"%PDF-1.4 fake pdf bytes", "application/pdf")}


def test_analyze_requires_login(client):
    res = client.post("/api/analyze", files=_pdf_file())
    assert res.status_code == 401


def test_analyze_stores_material_for_logged_in_user(client, session):
    user = register(client).json()

    with (
        patch("app.main.analyze_pdf", return_value="summary text"),
        patch("app.main.upload_file") as mock_upload,
    ):
        res = client.post("/api/analyze", files=_pdf_file())

    assert res.status_code == 200
    assert res.json() == {"result": "summary text"}
    mock_upload.assert_called_once()

    material = session.exec(select(CourseMaterial)).one()
    assert str(material.user_id) == user["id"]
    assert material.title == "notes"
    assert material.file_type == "pdf"
    assert material.file_path == mock_upload.call_args[0][1]  # the S3 key passed to upload_file
