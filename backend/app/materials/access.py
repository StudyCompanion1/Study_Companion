"""Looks up a collection or uploaded file that belongs to the logged-in student. Someone else's
is answered exactly like one that doesn't exist (404), so ids can't be probed."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Collection, CourseMaterial, User


def own_collection(session: Session, user: User, collection_id: uuid.UUID) -> Collection:
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    collection = session.exec(query).one_or_none()
    if collection is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return collection


def own_material(session: Session, user: User, material_id: uuid.UUID) -> CourseMaterial:
    query = select(CourseMaterial).where(CourseMaterial.id == material_id, CourseMaterial.user_id == user.id)
    material = session.exec(query).one_or_none()
    if material is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="File not found.")
    return material
