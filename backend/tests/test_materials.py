"""F1: a student uploads course material and it is stored and listed for them."""

import uuid
from datetime import datetime
from unittest.mock import patch

from sqlmodel import select

from app import storage
from app.materials import router as materials
from app.models import Collection, CourseMaterial
from tests.test_auth import register

MATERIALS = "/api/materials"


def _file(name="Week 1 slides.pdf", content=b"%PDF-1.4 fake pdf bytes", mime="application/pdf"):
    return {"file": (name, content, mime)}


def _collection(client, name="Biology"):
    return client.post("/api/collections", json={"name": name}).json()


def test_upload_and_list_require_login(client):
    assert client.post(MATERIALS, files=_file()).status_code == 401
    assert client.get(MATERIALS).status_code == 401


def test_upload_stores_file_and_records_material(client, session):
    user = register(client).json()

    with patch("app.materials.router.upload_file") as mock_upload:
        res = client.post(MATERIALS, files=_file())

    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Week 1 slides"
    assert body["file_type"] == "pdf"
    assert body["collection_id"] is None
    assert body["created_at"].endswith("Z")
    assert "file_path" not in body  # where it's stored stays private

    material = session.exec(select(CourseMaterial)).one()
    assert str(material.user_id) == user["id"]
    key = mock_upload.call_args[0][1]
    assert material.file_path == key
    assert key.startswith(f"users/{user['id']}/") and key.endswith(".pdf")


def test_upload_into_a_collection(client, session):
    register(client)
    collection = _collection(client)

    with patch("app.materials.router.upload_file"):
        res = client.post(MATERIALS, files=_file(), data={"collection_id": collection["id"]})

    assert res.status_code == 201
    assert res.json()["collection_id"] == collection["id"]
    # the upload counts as an edit, so the collection moves to the top of the list
    stored = session.get(Collection, uuid.UUID(collection["id"]))
    before = datetime.fromisoformat(collection["updated_at"]).replace(tzinfo=None)
    assert stored.updated_at.replace(tzinfo=None) > before


def test_cannot_upload_into_someone_elses_collection(client, session):
    register(client)
    theirs = _collection(client)
    client.post("/api/auth/logout")
    register(client, email="sam@example.com")

    with patch("app.materials.router.upload_file") as mock_upload:
        res = client.post(MATERIALS, files=_file(), data={"collection_id": theirs["id"]})
        missing = client.post(MATERIALS, files=_file(), data={"collection_id": str(uuid.uuid4())})

    assert res.status_code == 404
    assert missing.status_code == 404
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []


def test_upload_maps_each_file_type(client):
    register(client)
    expected = {"a.pptx": "ppt", "b.docx": "docx", "c.txt": "txt", "d.PNG": "image"}

    with patch("app.materials.router.upload_file"):
        for name, file_type in expected.items():
            res = client.post(MATERIALS, files=_file(name, b"data", "application/octet-stream"))
            assert res.json()["file_type"] == file_type


def test_upload_rejects_unsupported_type(client, session):
    register(client)

    with patch("app.materials.router.upload_file") as mock_upload:
        res = client.post(MATERIALS, files=_file("virus.exe", b"MZ", "application/octet-stream"))

    assert res.status_code == 400
    assert "isn't supported" in res.json()["detail"]
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []


def test_upload_rejects_empty_file(client):
    register(client)

    with patch("app.materials.router.upload_file") as mock_upload:
        res = client.post(MATERIALS, files=_file(content=b""))

    assert res.status_code == 400
    assert res.json()["detail"] == "This file is empty."
    mock_upload.assert_not_called()


def test_upload_rejects_file_over_limit(client, session, monkeypatch):
    register(client)
    monkeypatch.setattr(materials, "MAX_UPLOAD_BYTES", 10)
    monkeypatch.setattr(materials, "CHUNK_BYTES", 4)

    with patch("app.materials.router.upload_file") as mock_upload:
        res = client.post(MATERIALS, files=_file(content=b"x" * 11))

    assert res.status_code == 413
    mock_upload.assert_not_called()
    assert session.exec(select(CourseMaterial)).all() == []


def test_list_returns_only_my_materials_newest_first(client):
    register(client, email="first@example.com")
    with patch("app.materials.router.upload_file"):
        client.post(MATERIALS, files=_file("other.pdf"))

    client.post("/api/auth/logout")
    register(client, email="me@example.com")
    with patch("app.materials.router.upload_file"):
        client.post(MATERIALS, files=_file("older.pdf"))
        client.post(MATERIALS, files=_file("newer.pdf"))

    titles = [m["title"] for m in client.get(MATERIALS).json()]
    assert titles == ["newer", "older"]


def test_list_one_collections_materials(client):
    register(client)
    biology = _collection(client, "Biology")
    chemistry = _collection(client, "Chemistry")
    with patch("app.materials.router.upload_file"):
        client.post(MATERIALS, files=_file("cells.pdf"), data={"collection_id": biology["id"]})
        client.post(MATERIALS, files=_file("acids.pdf"), data={"collection_id": chemistry["id"]})
        client.post(MATERIALS, files=_file("loose.pdf"))

    res = client.get(MATERIALS, params={"collection_id": biology["id"]})

    assert [m["title"] for m in res.json()] == ["cells"]
    assert client.get(MATERIALS, params={"collection_id": str(uuid.uuid4())}).status_code == 404


def test_storage_saves_file_under_uploads(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "LOCAL_UPLOAD_DIR", tmp_path)
    source = tmp_path / "source.pdf"
    source.write_bytes(b"hello")

    storage.upload_file(str(source), "users/abc/file.pdf")

    assert (tmp_path / "users/abc/file.pdf").read_bytes() == b"hello"
    assert storage.object_key(uuid.uuid4(), "Notes.PDF").endswith(".pdf")
