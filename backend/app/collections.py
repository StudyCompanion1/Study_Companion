import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator
from sqlmodel import select

from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.models import Collection

router = APIRouter(prefix="/api/collections", tags=["collections"])


class CollectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    code: Annotated[str, StringConstraints(strip_whitespace=True, max_length=30)] | None = None
    term: Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)] | None = None


class CollectionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str | None
    term: str | None
    updated_at: datetime
    note_count: int = 0

    @field_validator("updated_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        # SQLite drops the timezone on read.
        return value if value.tzinfo else value.replace(tzinfo=UTC)


@router.post("", response_model=CollectionPublic, status_code=status.HTTP_201_CREATED)
def create_collection(body: CollectionCreate, user: CurrentUser, session: SessionDep) -> Collection:
    collection = Collection(user_id=user.id, name=body.name, code=body.code or None, term=body.term or None)
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


@router.get("", response_model=list[CollectionPublic])
def list_collections(user: CurrentUser, session: SessionDep) -> list[Collection]:
    query = select(Collection).where(Collection.user_id == user.id).order_by(Collection.updated_at.desc())
    return list(session.exec(query).all())


@router.get("/{collection_id:uuid}", response_model=CollectionPublic)
def get_collection(collection_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Collection:
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    collection = session.exec(query).one_or_none()
    if collection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return collection
