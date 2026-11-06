"""Uploaded course material lives in S3, not on disk or in the database (see
backend/app/models/material.py — CourseMaterial.file_path stores the S3 key).
"""

import uuid
from pathlib import Path

import boto3

from app.config import settings

_s3 = boto3.client("s3", region_name=settings.aws_region)


def object_key(user_id: uuid.UUID, filename: str) -> str:
    return f"users/{user_id}/{uuid.uuid4()}{Path(filename).suffix.lower()}"


def upload_file(local_path: str, key: str) -> None:
    _s3.upload_file(local_path, settings.s3_bucket, key)


def presigned_download_url(key: str, expires_in: int = 900) -> str:
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in,
    )
