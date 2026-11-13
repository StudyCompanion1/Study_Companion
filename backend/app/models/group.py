import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class StudyGroup(SQLModel, table=True):
    __tablename__ = "study_groups"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))


class StudyGroupMember(SQLModel, table=True):
    """Join table for the many-to-many "member of" relationship between users and study groups."""

    __tablename__ = "study_group_members"

    # Composite primary key, so a user can only join a given group once
    group_id: uuid.UUID = Field(foreign_key="study_groups.id", primary_key=True, ondelete="CASCADE")
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True, index=True, ondelete="CASCADE")
    joined_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))


class ChatMessage(SQLModel, table=True):
    """One message in a study group's chat log."""

    __tablename__ = "chat_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    group_id: uuid.UUID = Field(foreign_key="study_groups.id", index=True, ondelete="CASCADE")
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
