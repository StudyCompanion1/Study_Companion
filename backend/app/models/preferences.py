import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class ContrastPolarity(StrEnum):
    LIGHT = "light"
    DARK = "dark"
    HIGH_CONTRAST = "high_contrast"


class AccessibilityPreferences(SQLModel, table=True):
    __tablename__ = "accessibility_preferences"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Unique, so each user has at most one row
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, ondelete="CASCADE")
    # In pixels
    font_size: int = 16
    font_family: str = Field(default="system-ui", max_length=100)
    # Multiple of the font size
    line_spacing: float = 1.5
    contrast_polarity: ContrastPolarity = ContrastPolarity.LIGHT
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
#talk with team members about accesibility prefs