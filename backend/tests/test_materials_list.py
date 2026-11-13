"""F1: GET /api/materials and the storage it relies on (app/storage.py)."""

import uuid
from unittest.mock import patch

from app import storage
from tests.materials_helpers import MATERIALS, UPLOAD_FILE, new_collection, pdf, register


def test_list_requires_login(client):
    assert client.get(MATERIALS).status_code == 401


def test_list_returns_only_my_materials_newest_first(client):
    register(client, email="first@example.com")
    with patch(UPLOAD_FILE):
        client.post(MATERIALS, files=pdf("other.pdf"))

    client.post("/api/auth/logout")
    register(client, email="me@example.com")
    with patch(UPLOAD_FILE):
        client.post(MATERIALS, files=pdf("older.pdf"))
        client.post(MATERIALS, files=pdf("newer.pdf"))

    assert [m["title"] for m in client.get(MATERIALS).json()] == ["newer", "older"]


def test_list_one_collections_materials(client):
    register(client)
    biology = new_collection(client, "Biology")
    chemistry = new_collection(client, "Chemistry")
    with patch(UPLOAD_FILE):
        client.post(MATERIALS, files=pdf("cells.pdf"), data={"collection_id": biology["id"]})
        client.post(MATERIALS, files=pdf("acids.pdf"), data={"collection_id": chemistry["id"]})
        client.post(MATERIALS, files=pdf("loose.pdf"))

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
