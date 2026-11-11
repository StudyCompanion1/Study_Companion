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
    title: str = Field(max_length=200)
    file_type: FileType
    # Where the uploaded file lives in storage; the file itself is never stored in the database
    file_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
