"""F1 Upload course material: as a student, I want to upload my course materials,
so that I can study them in the app.

POST /api/materials saves the file (see app/storage.py) and records it as a CourseMaterial
owned by the logged-in user, optionally inside one of their collections. No AI runs here:
/api/analyze and /api/study-guide are the AI features.
"""

import os
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlmodel import select
from starlette.concurrency import run_in_threadpool

from ai_processing.keyword_concept_extraction import DOCUMENT_EXTENSIONS, SUPPORTED_EXTENSIONS
from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.models import Collection, CourseMaterial, FileType, User
from app.storage import object_key, upload_file

router = APIRouter(prefix="/api/materials", tags=["materials"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024

_DOCUMENT_TYPES = {".pdf": FileType.PDF, ".pptx": FileType.PPT, ".docx": FileType.DOCX, ".txt": FileType.TXT}


def file_type_for(extension: str) -> FileType:
    """CourseMaterial.file_type for an extension already checked against SUPPORTED_EXTENSIONS."""
    if extension in DOCUMENT_EXTENSIONS:
        return _DOCUMENT_TYPES[extension]
    return FileType.IMAGE


class MaterialPublic(BaseModel):
    """What the API returns about an uploaded file. Never includes where it is stored."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    collection_id: uuid.UUID | None
    title: str
    file_type: FileType
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        # SQLite drops the timezone on read; times are always stored in UTC
        return value if value.tzinfo else value.replace(tzinfo=UTC)


def _own_collection(session: SessionDep, user: User, collection_id: uuid.UUID) -> Collection:
    """The user's collection, or 404 — the same answer whether it doesn't exist or isn't theirs."""
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    collection = session.exec(query).one_or_none()
    if collection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return collection


@router.post("", response_model=MaterialPublic, status_code=status.HTTP_201_CREATED)
async def upload_material(
    user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(...),
    collection_id: uuid.UUID | None = Form(None),
) -> CourseMaterial:
    collection = _own_collection(session, user, collection_id) if collection_id else None

    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This file type isn't supported. Upload a PDF, Word, PowerPoint, text or image file.",
        )

    temp_path = None
    try:
        # Written in chunks so a huge file is rejected without being held in memory
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp:
            temp_path = temp.name
            total = 0
            while chunk := await file.read(CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, detail="File exceeds the 25 MB upload limit.")
                temp.write(chunk)

        if total == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This file is empty.")

        key = object_key(user.id, filename)
        await run_in_threadpool(upload_file, temp_path, key)
    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    material = CourseMaterial(
        user_id=user.id,
        collection_id=collection.id if collection else None,
        title=(Path(filename).stem or "Untitled")[:200],
        file_type=file_type_for(extension),
        file_path=key,
    )
    session.add(material)
    if collection:
        collection.updated_at = datetime.now(UTC)  # an upload counts as editing the collection
        session.add(collection)
    session.commit()
    session.refresh(material)
    return material


@router.get("", response_model=list[MaterialPublic])
def list_materials(
    user: CurrentUser,
    session: SessionDep,
    collection_id: uuid.UUID | None = Query(None),
) -> list[CourseMaterial]:
    """The logged-in user's uploads, newest first; only one collection's when collection_id is given."""
    query = select(CourseMaterial).where(CourseMaterial.user_id == user.id)
    if collection_id:
        _own_collection(session, user, collection_id)
        query = query.where(CourseMaterial.collection_id == collection_id)
    return list(session.exec(query.order_by(CourseMaterial.created_at.desc())).all())
