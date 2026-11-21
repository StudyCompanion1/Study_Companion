"""F1 Upload course material: as a student, I want to upload my course materials,
so that I can study them in the app.

The endpoints, registered in app/main.py:
- POST /api/materials  saves a file, optionally into one of the user's collections
- GET  /api/materials  lists the user's uploads, optionally for one collection
Opening a file, its pages and its notes are in viewer.py and notes.py; reordering is in order.py.

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
from sqlmodel import func, select
from starlette.concurrency import run_in_threadpool

from ai_processing.keyword_concept_extraction import SUPPORTED_EXTENSIONS
from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.materials.access import own_collection
from app.materials.pages import count_pages
from app.materials.schemas import MaterialPublic, file_type_for
from app.materials.temp_file import save_to_temp
from app.models import CourseMaterial
from app.storage import object_key, upload_file
from app.auth.guests import refund_guest_usage, usage_for_guest
from app.config import settings

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.post("", response_model=MaterialPublic, status_code=status.HTTP_201_CREATED)
async def upload_material(
    user: CurrentUser,  # 401 if not logged in (app/auth/dependencies.py)
    session: SessionDep,
    file: UploadFile = File(...),
    collection_id: uuid.UUID | None = Form(None),  # sent by the collection page, not by Home
) -> CourseMaterial:
    collection = own_collection(session, user, collection_id) if collection_id else None

    # 1. Only file types the app can study (the AI features read the same list)
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This file type isn't supported. Upload a PDF, Word, PowerPoint, text or image file.",
        )

    # (Guests only get a few uploads and is counted before any action is performed, given back if a task fails.)
    usage_for_guest(session, user, "guest_uploads_used", 1, settings.guest_max_uploads)

    # 2. Copy to a temp file (rejects empty or too-big files), then 3. keep it in storage
    file_type = file_type_for(extension)
    temp_path = None
    saved = False

    try:
        temp_path = await save_to_temp(file, extension)
        key = object_key(user.id, filename)
        await run_in_threadpool(upload_file, temp_path, key)  # file I/O off the event loop
        page_count = await run_in_threadpool(count_pages, temp_path, file_type)

        material = CourseMaterial(
            user_id = user.id,
            collection_id = collection.id if collection else None,
            title = (Path(filename).stem or "untitled")[:200],
            file_type = file_type,
            file_path = key,
            page_count = page_count,
            position = _top_position(session, collection.id) if collection else 0,
        )

        session.add(material)

        if collection:
            collection.updated_at = datetime.now(UTC) # An upload counts as editing the collection
            session.add(collection)
        session.commit()
        session.refresh(material)
        saved = True
        return material

    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        if not saved: # Rejected/Failed, don't take away an upload usage from guest
            refund_guest_usage(session, user, "guest_uploads_used", 1)

@router.get("", response_model=list[MaterialPublic])
def list_materials(
    user: CurrentUser,
    session: SessionDep,
    collection_id: uuid.UUID | None = Query(None),
) -> list[CourseMaterial]:
    """The logged-in user's uploads in their chosen order (new uploads go on top);
    only one collection's when collection_id is given."""
    query = select(CourseMaterial).where(CourseMaterial.user_id == user.id)
    if collection_id:
        own_collection(session, user, collection_id)  # 404 for someone else's collection
        query = query.where(CourseMaterial.collection_id == collection_id)
    order = (CourseMaterial.position, CourseMaterial.created_at.desc())
    return list(session.exec(query.order_by(*order)).all())


def _top_position(session: SessionDep, collection_id: uuid.UUID) -> int:
    """One above the collection's first file, so a new upload shows at the top."""
    query = select(func.min(CourseMaterial.position)).where(CourseMaterial.collection_id == collection_id)
    first = session.exec(query).one()
    return 0 if first is None else first - 1
