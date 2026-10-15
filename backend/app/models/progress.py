import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


class ProgressLog(SQLModel, table=True):
    __tablename__ = "progress_logs"
    # One running log per user per material, updated as they study
    __table_args__ = (UniqueConstraint("user_id", "material_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    material_id: uuid.UUID = Field(foreign_key="course_materials.id", index=True, ondelete="CASCADE")
    # 0 to 100
    completion_percentage: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True))
