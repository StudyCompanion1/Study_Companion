# backend/app/main.py
import os
import tempfile
from pathlib import Path
from zipfile import BadZipFile
from contextlib import asynccontextmanager

import pymupdf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from ai_processing.keyword_concept_extraction import (
    SUPPORTED_EXTENSIONS,
    analyze_pdf,
    generate_study_guide,
)

from app.auth.router import router as auth_router
from app.db import create_db_and_tables


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
async def _process_upload(file: UploadFile, task: str):

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
async def analyze(file: UploadFile = File(...)):

    return await _process_upload(
        file,
        "summary"
    )


# api #2 - study guide
@app.post("/api/study-guide")
async def study_guide(file: UploadFile = File(...)):

    return await _process_upload(
        file,
        "guide"
    )