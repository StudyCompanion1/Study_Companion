import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class Collection(SQLModel, table=True):
    __tablename__ = "collections"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=100)
    code: str | None = Field(default=None, max_length=30)
    term: str | None = Field(default=None, max_length=60)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
