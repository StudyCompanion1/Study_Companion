"""F1 Upload material — the shapes and rules shared by the upload endpoints (router.py).

Kept apart from the router so each file stays small:
- MaterialPublic: what the API sends back about an uploaded file
- file_type_for: turns a file extension into the CourseMaterial.file_type stored in the database
"""

import uuid
from datetime import UTC, datetime
from pathlib import PurePosixPath

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from ai_processing.keyword_concept_extraction import DOCUMENT_EXTENSIONS
from app.models import FileType

# Document extensions map to their own type; every other supported extension is an image
_DOCUMENT_TYPES = {".pdf": FileType.PDF, ".pptx": FileType.PPT, ".docx": FileType.DOCX, ".txt": FileType.TXT}


def file_type_for(extension: str) -> FileType:
    """CourseMaterial.file_type for an extension already checked against SUPPORTED_EXTENSIONS."""
    if extension in DOCUMENT_EXTENSIONS:
        return _DOCUMENT_TYPES[extension]
    return FileType.IMAGE


def _assume_utc(value: datetime | None) -> datetime | None:
    # SQLite drops the timezone on read; times are always stored in UTC
    return value if value is None or value.tzinfo else value.replace(tzinfo=UTC)


class MaterialPublic(BaseModel):
    """What the API returns about an uploaded file. Never includes where it is stored
    (CourseMaterial.file_path), so storage details can't leak to the browser."""

    model_config = ConfigDict(from_attributes=True)  # lets FastAPI build it from a CourseMaterial row

    id: uuid.UUID
    collection_id: uuid.UUID | None  # None = uploaded from Home, not into a collection
    title: str
    file_type: FileType
    position: int
    page_count: int | None
    last_opened_at: datetime | None
    created_at: datetime
    # Read only to work out file_name below; left out of the response
    file_path: str = Field(exclude=True)

    @computed_field
    @property
    def file_name(self) -> str:
        """The name it was uploaded with, e.g. "Week 1.pdf" (the title plus the stored extension)."""
        return self.title + PurePosixPath(self.file_path).suffix

    assume_utc = field_validator("created_at", "last_opened_at")(_assume_utc)
