import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


class Note(SQLModel, table=True):
    __tablename__ = "notes"
    # One note per page (or slide) of a material, so notes line up with the page they are about
    __table_args__ = (UniqueConstraint("user_id", "material_id", "page"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    # A note outlives the material it was written against
    material_id: uuid.UUID | None = Field(
        default=None, foreign_key="course_materials.id", index=True, ondelete="SET NULL"
    )
    # 1-based page or slide of the material; None = about the whole file (or no file)
    page: int | None = None
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
