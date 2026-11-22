"""The material view: a file on the left, the student's notes for each page on the right.

- GET  /api/materials/{id}                        one uploaded file
- POST /api/materials/{id}/open                   marks it opened (the "Opened" column)
- GET  /api/materials/{id}/pages                  its pages, from pages.py
- GET  /api/materials/{id}/pages/{n}/image        a picture of one page (PDFs and images)
The notes themselves are in notes.py.
"""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Path, Response, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.materials.access import own_material
from app.materials.pages import page_image, read_pages
from app.materials.schemas import MaterialPublic
from app.models import FileType
from app.storage import stored_path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/materials", tags=["materials"])


class PagePublic(BaseModel):
    number: int
    text: str | None  # shown when there's no picture (slides, Word and text files)
    image: bool  # True: GET .../pages/{number}/image has a picture of it
    width: int | None
    height: int | None


@router.get("/{material_id:uuid}", response_model=MaterialPublic)
def get_material(material_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    return own_material(session, user, material_id)


@router.post("/{material_id:uuid}/open", response_model=MaterialPublic)
def open_material(material_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    material = own_material(session, user, material_id)
    material.last_opened_at = datetime.now(UTC)
    session.add(material)
    session.commit()
    session.refresh(material)
    return material


@router.get("/{material_id:uuid}/pages", response_model=list[PagePublic])
async def material_pages(material_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    material = own_material(session, user, material_id)
    try:
        path = stored_path(material.file_path)
        pages = await run_in_threadpool(read_pages, path, material.file_type)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This file is missing from storage.")
    except Exception:  # noqa: BLE001  (a damaged upload can fail in many ways; the student just can't preview it)
        logger.warning("Couldn't read material %s", material.id, exc_info=True)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="This file couldn't be read.")

    if material.page_count is None and material.file_type in (FileType.PDF, FileType.PPT):
        material.page_count = len(pages)  # files uploaded before page counts existed
        session.add(material)
        session.commit()

    has_pictures = material.file_type in (FileType.PDF, FileType.IMAGE)
    return [PagePublic(**vars(page), image=has_pictures) for page in pages]


@router.get("/{material_id:uuid}/pages/{number}/image")
async def material_page_image(
    material_id: uuid.UUID, user: CurrentUser, session: SessionDep, number: int = Path(ge=1, le=10_000)
):
    material = own_material(session, user, material_id)
    try:
        path = stored_path(material.file_path)
        content, media_type = await run_in_threadpool(page_image, path, material.file_type, number)
    except (FileNotFoundError, IndexError, ValueError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="There's no picture of that page.")
    except Exception:  # noqa: BLE001
        logger.warning("Couldn't draw page %s of material %s", number, material.id, exc_info=True)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="This page couldn't be shown.")
    # Private: only this student may see it. A page never changes, so the browser can keep it a while.
    return Response(content, media_type=media_type, headers={"Cache-Control": "private, max-age=3600"})
