"""Where uploaded course material is kept. The database only stores the key
(CourseMaterial.file_path), never the file itself.

With S3_BUCKET set (staging/production, TI-2) files live in that S3 bucket. Without it
(local dev, tests) they're saved under backend/uploads/ (git-ignored). Callers use the same
functions either way.
"""

import shutil
import tempfile
import uuid
from functools import cache
from pathlib import Path

from app.config import BACKEND_DIR, settings

LOCAL_UPLOAD_DIR = BACKEND_DIR / "uploads"
# Files read back from S3 for the material view are cached here, one copy per key.
S3_CACHE_DIR = Path(tempfile.gettempdir()) / "study-companion-s3-cache"


def _use_s3() -> bool:
    return bool(settings.s3_bucket)


@cache
def _s3():
    import boto3  # only needed when S3 is configured

    return boto3.client("s3", region_name=settings.aws_region)


def object_key(user_id: uuid.UUID, filename: str) -> str:
    """A unique storage key per upload, so two files with the same name never clash."""
    return f"users/{user_id}/{uuid.uuid4()}{Path(filename).suffix.lower()}"


def upload_file(local_path: str, key: str) -> None:
    if _use_s3():
        _s3().upload_file(local_path, settings.s3_bucket, key)
        return
    destination = LOCAL_UPLOAD_DIR / key
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(local_path, destination)


def stored_path(key: str) -> Path:
    """A local path to read a stored file from, for the material view.
    Raises FileNotFoundError when it isn't there. (With S3 this downloads to a cached temp file first.)
    """
    root = (S3_CACHE_DIR if _use_s3() else LOCAL_UPLOAD_DIR).resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise FileNotFoundError(key)

    if _use_s3() and not path.is_file():
        from botocore.exceptions import ClientError

        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_name(f"{path.name}.{uuid.uuid4().hex}.part")
        try:
            _s3().download_file(settings.s3_bucket, key, str(partial))
            partial.replace(path)
        except ClientError as exc:
            raise FileNotFoundError(key) from exc
        finally:
            partial.unlink(missing_ok=True)

    if not path.is_file():
        raise FileNotFoundError(key)
    return path


def presigned_download_url(key: str, expires_in: int = 900) -> str:
    """A short-lived S3 link to the file (S3 only)."""
    return _s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in,
    )


# Remove all of guest's stored information after it expires
def delete_user_files(user_id: uuid.UUID) -> None:
    prefix = f"users/{user_id}/"
    if _use_s3():
        paginator = _s3().get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=settings.s3_bucket, Prefix=prefix):
            objects = [{"Key": item["Key"]} for item in page.get("Contents", [])]
            if objects:
                _s3().delete_objects(Bucket=settings.s3_bucket, Delete={"Objects": objects})
        shutil.rmtree(S3_CACHE_DIR / "users" / str(user_id), ignore_errors=True)
        return
    shutil.rmtree(LOCAL_UPLOAD_DIR / "users" / str(user_id), ignore_errors=True)
