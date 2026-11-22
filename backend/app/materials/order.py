"""Lets a student put the files in a collection into their own order (drag, or the arrow buttons).

PUT /api/materials/order  {collection_id, material_ids}  saves the whole new order at once.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import select

from app.auth.dependencies import CurrentUser
from app.db import SessionDep
from app.materials.access import own_collection
from app.models import CourseMaterial

router = APIRouter(prefix="/api/materials", tags=["materials"])


class MaterialOrder(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collection_id: uuid.UUID
    # Every file in the collection, first to last
    material_ids: list[uuid.UUID] = Field(max_length=5_000)


@router.put("/order", status_code=status.HTTP_204_NO_CONTENT)
def reorder_materials(body: MaterialOrder, user: CurrentUser, session: SessionDep) -> None:
    own_collection(session, user, body.collection_id)
    query = select(CourseMaterial).where(
        CourseMaterial.user_id == user.id, CourseMaterial.collection_id == body.collection_id
    )
    by_id = {material.id: material for material in session.exec(query)}

    # The list must name each file exactly once, or a file could end up in two places (or none)
    if len(body.material_ids) != len(by_id) or set(body.material_ids) != set(by_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="This list of files is out of date. Refresh the page and try again.",
        )

    for position, material_id in enumerate(body.material_ids):
        by_id[material_id].position = position
        session.add(by_id[material_id])
    session.commit()
