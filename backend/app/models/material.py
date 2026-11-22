import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class FileType(StrEnum):
    PDF = "pdf"
    PPT = "ppt"
    DOCX = "docx"
    TXT = "txt"
    IMAGE = "image"


class CourseMaterial(SQLModel, table=True):
    __tablename__ = "course_materials"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    # The collection (course) it was uploaded into; None when uploaded from Home
    collection_id: uuid.UUID | None = Field(
        default=None, foreign_key="collections.id", index=True, ondelete="CASCADE"
    )
    title: str = Field(max_length=200)
    file_type: FileType
    # Where the uploaded file lives in storage; the file itself is never stored in the database
    file_path: str
    # Its place in the collection's list (lowest first); students can drag files into their own order
    position: int = 0
    # Pages (PDF, Word) or slides (PowerPoint); None when the file has no pages or couldn't be read
    page_count: int | None = None
    # Last time the student opened it or wrote notes on it; None = never opened
    last_opened_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
