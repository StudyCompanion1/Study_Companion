import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class Highlight(SQLModel, table=True):
    __tablename__ = "highlights"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    material_id: uuid.UUID = Field(foreign_key="course_materials.id", index=True, ondelete="CASCADE")
    text_snippet: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
