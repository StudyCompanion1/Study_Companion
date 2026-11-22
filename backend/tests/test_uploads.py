"""TI-2: the AI upload endpoints require login, and app/storage.py uses S3 once S3_BUCKET is set."""

import uuid
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from app import storage
from app.config import settings


def _pdf_file():
    return {"file": ("notes.pdf", b"%PDF-1.4 fake pdf bytes", "application/pdf")}


def test_analyze_requires_login(client):
    res = client.post("/api/analyze", files=_pdf_file())
    assert res.status_code == 401


@pytest.fixture
def s3(tmp_path, monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(settings, "s3_bucket", "test-bucket")
    monkeypatch.setattr(storage, "_s3", lambda: client)
    monkeypatch.setattr(storage, "S3_CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(storage, "LOCAL_UPLOAD_DIR", tmp_path / "uploads")
    return client


def test_upload_file_goes_to_s3(s3, tmp_path):
    storage.upload_file("/tmp/notes.pdf", "users/abc/file.pdf")

    s3.upload_file.assert_called_once_with("/tmp/notes.pdf", "test-bucket", "users/abc/file.pdf")
    assert not (tmp_path / "uploads").exists()


def test_stored_path_downloads_from_s3_once(s3):
    s3.download_file.side_effect = lambda bucket, key, dest: open(dest, "wb").write(b"data")

    first = storage.stored_path("users/abc/file.pdf")
    second = storage.stored_path("users/abc/file.pdf")

    assert first == second and first.read_bytes() == b"data"
    s3.download_file.assert_called_once()


def test_stored_path_missing_in_s3(s3):
    s3.download_file.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")

    with pytest.raises(FileNotFoundError):
        storage.stored_path("users/abc/missing.pdf")
    with pytest.raises(FileNotFoundError):
        storage.stored_path("../secret.txt")
    s3.download_file.assert_called_once()


def test_delete_user_files_removes_s3_objects(s3):
    user_id = uuid.uuid4()
    s3.get_paginator.return_value.paginate.return_value = [
        {"Contents": [{"Key": f"users/{user_id}/a.pdf"}, {"Key": f"users/{user_id}/b.txt"}]},
        {},
    ]

    storage.delete_user_files(user_id)

    s3.get_paginator.return_value.paginate.assert_called_once_with(
        Bucket="test-bucket", Prefix=f"users/{user_id}/"
    )
    s3.delete_objects.assert_called_once_with(
        Bucket="test-bucket",
        Delete={"Objects": [{"Key": f"users/{user_id}/a.pdf"}, {"Key": f"users/{user_id}/b.txt"}]},
    )
