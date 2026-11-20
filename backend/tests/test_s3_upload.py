"""Unit tests for the standalone S3 helper; no AWS connection or credentials needed."""

from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError, NoCredentialsError

import upload


@pytest.fixture
def s3(monkeypatch):
    for name, value in {
        "AWS_S3_BUCKET_NAME": "test-bucket",
        "AWS_ACCESS_KEY_ID": "fake-access-key",
        "AWS_SECRET_ACCESS_KEY": "fake-secret-key",
    }.items():
        monkeypatch.setenv(name, value)
    monkeypatch.delenv("AWS_REGION", raising=False)
    factory = Mock()
    monkeypatch.setattr(upload.boto3, "client", factory)
    return factory


@pytest.mark.parametrize("object_name", [None, "courses/biology.txt"])
def test_s3_upload_uses_bucket_credentials_and_destination(tmp_path, s3, object_name):
    path = tmp_path / "notes.txt"
    path.write_text("Biology notes")
    assert upload.upload_file_to_s3(str(path), object_name) is True
    s3.assert_called_once_with(
        "s3", aws_access_key_id="fake-access-key", aws_secret_access_key="fake-secret-key", region_name="us-east-1",
    )
    s3.return_value.upload_file.assert_called_once_with(str(path), "test-bucket", object_name or "notes.txt")


def test_s3_upload_honors_configured_region(s3, monkeypatch):
    monkeypatch.setenv("AWS_REGION", "us-west-2")
    assert upload.upload_file_to_s3("notes.txt") is True
    assert s3.call_args.kwargs["region_name"] == "us-west-2"


@pytest.mark.parametrize("error", [
    FileNotFoundError("missing.txt"),
    NoCredentialsError(),
    ClientError({"Error": {"Code": "AccessDenied", "Message": "Denied"}}, "PutObject"),
])
def test_s3_upload_returns_false_on_expected_failures(s3, error):
    s3.return_value.upload_file.side_effect = error
    assert upload.upload_file_to_s3("notes.txt") is False


def test_s3_client_creation_failure_returns_false(s3):
    s3.side_effect = NoCredentialsError()
    assert upload.upload_file_to_s3("notes.txt") is False
