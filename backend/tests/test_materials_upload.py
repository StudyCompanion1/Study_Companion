"""F1: POST /api/materials stores a student's file (app/materials/router.py)."""

import uuid
from datetime import datetime
from unittest.mock import patch

from sqlmodel import select

from app.models import Collection, CourseMaterial
from tests.materials_helpers import MATERIALS, UPLOAD_FILE, new_collection, pdf, register


def test_upload_requires_login(client):
    assert client.post(MATERIALS, files=pdf()).status_code == 401


def test_upload_stores_file_and_records_material(client, session):
    user = register(client).json()

    with patch(UPLOAD_FILE) as mock_upload:
        res = client.post(MATERIALS, files=pdf())

    assert res.status_code == 201
    body = res.json()
    assert (body["title"], body["file_type"], body["collection_id"]) == ("Week 1 slides", "pdf", None)
    assert body["created_at"].endswith("Z")
    assert "file_path" not in body  # where it's stored stays private

    material = session.exec(select(CourseMaterial)).one()
    key = mock_upload.call_args[0][1]
    assert str(material.user_id) == user["id"] and material.file_path == key
    assert key.startswith(f"users/{user['id']}/") and key.endswith(".pdf")


def test_upload_into_a_collection_marks_it_edited(client, session):
    register(client)
    collection = new_collection(client)

    with patch(UPLOAD_FILE):
        res = client.post(MATERIALS, files=pdf(), data={"collection_id": collection["id"]})

    assert res.status_code == 201
    assert res.json()["collection_id"] == collection["id"]
    stored = session.get(Collection, uuid.UUID(collection["id"]))
    before = datetime.fromisoformat(collection["updated_at"]).replace(tzinfo=None)
    assert stored.updated_at.replace(tzinfo=None) > before


def test_cannot_upload_into_someone_elses_collection(client, session):
    register(client)
    theirs = new_collection(client)
    client.post("/api/auth/logout")
    register(client, email="sam@example.com")

    with patch(UPLOAD_FILE) as mock_upload:
        res = client.post(MATERIALS, files=pdf(), data={"collection_id": theirs["id"]})
        missing = client.post(MATERIALS, files=pdf(), data={"collection_id": str(uuid.uuid4())})

    assert (res.status_code, missing.status_code) == (404, 404)
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []


def test_upload_maps_each_file_type(client):
    register(client)
    expected = {"a.pptx": "ppt", "b.docx": "docx", "c.txt": "txt", "d.PNG": "image"}

    with patch(UPLOAD_FILE):
        for name, file_type in expected.items():
            res = client.post(MATERIALS, files=pdf(name, b"data", "application/octet-stream"))
            assert res.json()["file_type"] == file_type
