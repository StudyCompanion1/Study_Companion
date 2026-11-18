"""Where uploaded course material is kept. The database only stores the key
(CourseMaterial.file_path), never the file itself.

Files are saved under backend/uploads/ (git-ignored). The AWS work (TI-2, on main) keeps
the same two functions and swaps the body of upload_file for an S3 upload, so the rest of
the code doesn't change when that lands.
"""

import shutil
import uuid
from pathlib import Path

from app.config import BACKEND_DIR

LOCAL_UPLOAD_DIR = BACKEND_DIR / "uploads"


def object_key(user_id: uuid.UUID, filename: str) -> str:
    """A unique storage key per upload, so two files with the same name never clash."""
    return f"users/{user_id}/{uuid.uuid4()}{Path(filename).suffix.lower()}"


def upload_file(local_path: str, key: str) -> None:
    destination = LOCAL_UPLOAD_DIR / key
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(local_path, destination)
