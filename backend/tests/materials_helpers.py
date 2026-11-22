"""Shared helpers for the F1 upload tests (test_materials_*.py)."""

from tests.test_auth import register  # noqa: F401  (re-exported so the tests import one place)

MATERIALS = "/api/materials"
# Patched in tests so nothing is written to backend/uploads/
UPLOAD_FILE = "app.materials.router.upload_file"


def pdf(name="Week 1 slides.pdf", content=b"%PDF-1.4 fake pdf bytes", mime="application/pdf"):
    """A file for the `files=` argument of client.post."""
    return {"file": (name, content, mime)}


def new_collection(client, name="Biology"):
    return client.post("/api/collections", json={"name": name}).json()
