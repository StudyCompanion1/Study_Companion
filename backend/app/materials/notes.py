"""Notes in the material view: one per page (or slide), saved as the student types.

- GET /api/materials/{id}/notes          every note the student has written on the file
- PUT /api/materials/{id}/notes/{page}   save the note for one page (creates it the first time;
                                         saving it empty removes it)

Word and text files have no fixed pages, so the student adds notes pages as they need them
(up to MAX_ADDED_PAGES). Other files take one note per page, or one for the whole file.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.materials.access import own_material
from app.models import Collection, CourseMaterial, FileType, Note, User

router = APIRouter(prefix="/api/materials", tags=["notes"])

MAX_NOTE_CHARS = 20_000
MAX_ADDED_PAGES = 50
ADDS_PAGES = {FileType.DOCX, FileType.TXT}


class NoteSave(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(max_length=MAX_NOTE_CHARS)


class NotePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page: int
    text: str
    updated_at: datetime

    @field_validator("updated_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)


@router.get("/{material_id:uuid}/notes", response_model=list[NotePublic])
def list_notes(material_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    own_material(session, user, material_id)
    return session.exec(_notes_query(user, material_id).order_by(Note.page)).all()


@router.put("/{material_id:uuid}/notes/{page}", response_model=NotePublic)
def save_note(
    material_id: uuid.UUID,
    body: NoteSave,
    user: CurrentUser,
    session: SessionDep,
    page: int = Path(ge=1, le=10_000),
):
    material = own_material(session, user, material_id)
    if page > _page_limit(material):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This file doesn't have that page.")

    now = datetime.now(UTC)
    note = _find(session, user, material_id, page)
    if not body.text:
        # An empty note is the same as no note, so nothing is left behind
        if note is not None:
            session.delete(note)
        _mark_worked_on(session, material, now)
        session.commit()
        return NotePublic(page=page, text="", updated_at=now)
    if note is None:
        note = Note(user_id=user.id, material_id=material_id, page=page, text=body.text)
    note.text, note.updated_at = body.text, now
    session.add(note)
    _mark_worked_on(session, material, now)
    try:
        session.commit()
    except IntegrityError:
        # Two saves of a brand-new note raced; the other one created it, so update that instead
        session.rollback()
        note = _find(session, user, material_id, page)
        note.text, note.updated_at = body.text, now
        session.add(note)
        _mark_worked_on(session, material, now)
        session.commit()
    session.refresh(note)
    return note


def _page_limit(material: CourseMaterial) -> int:
    return MAX_ADDED_PAGES if material.file_type in ADDS_PAGES else material.page_count or 1


def _notes_query(user: User, material_id: uuid.UUID):
    return select(Note).where(Note.user_id == user.id, Note.material_id == material_id)


def _find(session: SessionDep, user: User, material_id: uuid.UUID, page: int) -> Note | None:
    return session.exec(_notes_query(user, material_id).where(Note.page == page)).one_or_none()


def _mark_worked_on(session: SessionDep, material: CourseMaterial, now: datetime) -> None:
    """Writing notes counts as opening the file, and as editing its collection."""
    material.last_opened_at = now
    session.add(material)
    if material.collection_id and (collection := session.get(Collection, material.collection_id)):
        collection.updated_at = now
        session.add(collection)
