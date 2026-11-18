"""Where uploaded course material is kept. The database only stores the key
(CourseMaterial.file_path), never the file itself.

Files are saved under backend/uploads/ (git-ignored). The AWS work (TI-2, on main) keeps
the same functions and swaps the bodies of upload_file and stored_path for S3 calls, so the
rest of the code doesn't change when that lands.
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


def stored_path(key: str) -> Path:
    """A local path to read a stored file from, for the material view.
    Raises FileNotFoundError when it isn't there. (With S3 this downloads to a temp file first.)
    """
    root = LOCAL_UPLOAD_DIR.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise FileNotFoundError(key)
    return path
