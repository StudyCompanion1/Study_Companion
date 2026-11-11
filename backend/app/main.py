# backend/app/main.py
import os
import tempfile
from pathlib import Path
from zipfile import BadZipFile
from contextlib import asynccontextmanager

from app.auth.dependencies import CurrentUser
from app.auth.router import router as auth_router
from app.db import SessionDep, create_db_and_tables
from app.models import CourseMaterial, FileType
from app.storage import object_key, upload_file
import pymupdf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from ai_processing.keyword_concept_extraction import (
    DOCUMENT_EXTENSIONS,
    SUPPORTED_EXTENSIONS,
    analyze_pdf,
    generate_study_guide,
)


def _file_type_for(extension: str) -> FileType:
    """CourseMaterial.file_type for an upload extension already checked against SUPPORTED_EXTENSIONS."""
    if extension == ".pdf":
        return FileType.PDF
    if extension == ".pptx":
        return FileType.PPT
    if extension == ".docx":
        return FileType.DOCX
    if extension == ".txt":
        return FileType.TXT
    if extension in DOCUMENT_EXTENSIONS:  # pragma: no cover - DOCUMENT_EXTENSIONS is exactly the 4 above today
        raise AssertionError(f"unmapped document extension: {extension}")
    return FileType.IMAGE

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Study Companion API", lifespan=lifespan)
app.include_router(auth_router)

# react / vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


# health check
@app.get("/api/health")
def health():
    return {"status": "ok"}


# shared file upload processing
async def _process_upload(file: UploadFile, task: str, user: CurrentUser, session: SessionDep):

    extension = Path(file.filename or "").suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type."
        )

    temp_path = None

    try:
        # save uploaded file temporarily
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp:

            temp_path = temp.name
            total = 0

            while chunk := await file.read(1024 * 1024):

                total += len(chunk)

                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the 25 MB upload limit."
                    )

                temp.write(chunk)

        # select Gemini processing function
        processor = (
            analyze_pdf
            if task == "summary"
            else generate_study_guide
        )

        # process outside the event loop
        result = await run_in_threadpool(
            processor,
            temp_path
        )

        # keep the file so it shows up in the user's collections (CourseMaterial)
        key = object_key(user.id, file.filename or "")
        await run_in_threadpool(upload_file, temp_path, key)
        session.add(CourseMaterial(
            user_id=user.id,
            title=Path(file.filename or "untitled").stem,
            file_type=_file_type_for(extension),
            file_path=key,
        ))
        session.commit()

        return {"result": result}

    except (
        ValueError,
        UnicodeError,
        pymupdf.FileDataError,
        BadZipFile,
        UnidentifiedImageError
    ) as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    finally:
        await file.close()

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


# api #1 - concepts and keywords
@app.post("/api/analyze")
async def analyze(user: CurrentUser, session: SessionDep, file: UploadFile = File(...)):

    return await _process_upload(
        file,
        "summary",
        user,
        session
    )


# api #2 - study guide
@app.post("/api/study-guide")
async def study_guide(user: CurrentUser, session: SessionDep, file: UploadFile = File(...)):

    return await _process_upload(
        file,
        "guide",
        user,
        session
    )