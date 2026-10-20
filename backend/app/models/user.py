import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"
    INSTRUCTOR = "instructor"


class User(SQLModel, table=True):
    """Temporary user table for DA-2, following the Sprint 0 class diagram.

    DA-1 owns the data models; reconcile this with theirs when it lands.
    """

    # "user" is a reserved word in PostgreSQL
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    # Always stored lowercase so lookups are case-insensitive
    email: str = Field(max_length=254, unique=True, index=True)
    password_hash: str
    role: UserRole = UserRole.STUDENT
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
