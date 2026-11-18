"""F1 Upload course material: as a student, I want to upload my course materials,
so that I can study them in the app.

The endpoints, registered in app/main.py:
- POST /api/materials  saves a file, optionally into one of the user's collections
- GET  /api/materials  lists the user's uploads, optionally for one collection

How one upload flows through the files in this folder:
  check the extension → temp_file.save_to_temp (size checks) → app/storage.upload_file
  (keeps the file) → a CourseMaterial row in the database → schemas.MaterialPublic (response)
No AI runs here: /api/analyze and /api/study-guide are the AI features.
"""

import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlmodel import select
from starlette.concurrency import run_in_threadpool

from ai_processing.keyword_concept_extraction import SUPPORTED_EXTENSIONS
from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.materials.schemas import MaterialPublic, file_type_for
from app.materials.temp_file import save_to_temp
from app.models import Collection, CourseMaterial, User
from app.storage import object_key, upload_file

router = APIRouter(prefix="/api/materials", tags=["materials"])


def _own_collection(session: SessionDep, user: User, collection_id: uuid.UUID) -> Collection:
    """The user's collection, or 404 — the same answer whether it doesn't exist or isn't theirs."""
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    collection = session.exec(query).one_or_none()
    if collection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return collection


@router.post("", response_model=MaterialPublic, status_code=status.HTTP_201_CREATED)
async def upload_material(
    user: CurrentUser,  # 401 if not logged in (app/auth/dependencies.py)
    session: SessionDep,
    file: UploadFile = File(...),
    collection_id: uuid.UUID | None = Form(None),  # sent by the collection page, not by Home
) -> CourseMaterial:
    collection = _own_collection(session, user, collection_id) if collection_id else None

    # 1. Only file types the app can study (the AI features read the same list)
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This file type isn't supported. Upload a PDF, Word, PowerPoint, text or image file.",
        )

    # 2. Copy to a temp file (rejects empty or too-big files), then 3. keep it in storage
    temp_path = None
    try:
        temp_path = await save_to_temp(file, extension)
        key = object_key(user.id, filename)
        await run_in_threadpool(upload_file, temp_path, key)  # file I/O off the event loop
    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    # 4. Record it so it shows up in the app
    material = CourseMaterial(
        user_id=user.id,
        collection_id=collection.id if collection else None,
        title=(Path(filename).stem or "Untitled")[:200],  # "Week 1.pdf" → "Week 1"
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
        _own_collection(session, user, collection_id)  # 404 for someone else's collection
        query = query.where(CourseMaterial.collection_id == collection_id)
    return list(session.exec(query.order_by(CourseMaterial.created_at.desc())).all())
