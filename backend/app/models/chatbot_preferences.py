import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class ChatbotPreferences(SQLModel, table=True):
    """Stores learned AI chatbot response preferences for each user."""

    __tablename__ = "chatbot_preferences"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    # Each user has at most one chatbot preference record.
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        unique=True,
        index=True,
        ondelete="CASCADE",
    )

    # These preferences guide how the chatbot explains information.
    explanation_style: str = Field(
        default="clear and conversational",
        max_length=100,
    )

    response_length: str = Field(
        default="moderate",
        max_length=50,
    )

    use_step_by_step: bool = Field(default=True)

    use_examples: bool = Field(default=True)

    # Timestamp of the most recent preference update.
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=DateTime(timezone=True),
    )
