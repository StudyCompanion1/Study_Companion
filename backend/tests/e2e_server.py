"""Playwright's API server, with throwaway storage as well as a throwaway database."""

from contextlib import asynccontextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

from app import storage
from app.main import app

original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def lifespan(application):
    original_upload_dir = storage.LOCAL_UPLOAD_DIR
    with TemporaryDirectory(prefix="study-companion-e2e-") as directory:
        storage.LOCAL_UPLOAD_DIR = Path(directory)
        try:
            async with original_lifespan(application):
                yield
        finally:
            storage.LOCAL_UPLOAD_DIR = original_upload_dir


app.router.lifespan_context = lifespan
