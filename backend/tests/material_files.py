"""Real (tiny) files for the material view tests, built in memory with the same libraries the
backend reads them with."""

import io
import zipfile

import pymupdf
import pytest
from docx import Document
from PIL import Image
from pptx import Presentation

from app import storage


@pytest.fixture
def uploads(tmp_path, monkeypatch):
    """Uploads are really saved, into a temp folder instead of backend/uploads/."""
    monkeypatch.setattr(storage, "LOCAL_UPLOAD_DIR", tmp_path / "uploads")
    return tmp_path / "uploads"


def pdf_bytes(pages=3) -> bytes:
    pdf = pymupdf.open()
    for number in range(1, pages + 1):
        pdf.new_page(width=200, height=100).insert_text((20, 50), f"Page {number}")
    return pdf.tobytes()


def pptx_bytes(titles=("Cell structure", "Mitochondria")) -> bytes:
    deck = Presentation()
    for title in titles:
        slide = deck.slides.add_slide(deck.slide_layouts[1])  # title and content
        slide.shapes.title.text = title
        slide.placeholders[1].text = f"About {title.lower()}"
    buffer = io.BytesIO()
    deck.save(buffer)
    return buffer.getvalue()


def docx_bytes(paragraphs=("Lab 2", "Osmosis results"), pages: int | None = 4) -> bytes:
    doc = Document()
    for text in paragraphs:
        doc.add_paragraph(text)
    buffer = io.BytesIO()
    doc.save(buffer)
    return _with_page_count(buffer.getvalue(), pages)


def image_bytes(fmt="PNG", size=(40, 30)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, "teal").save(buffer, format=fmt)
    return buffer.getvalue()


def _with_page_count(docx: bytes, pages: int | None) -> bytes:
    """Rewrites docProps/app.xml, where Word keeps its page count (None = no app.xml at all)."""
    source, out = zipfile.ZipFile(io.BytesIO(docx)), io.BytesIO()
    with zipfile.ZipFile(out, "w") as target:
        for item in source.infolist():
            if item.filename == "docProps/app.xml":
                if pages is not None:
                    target.writestr(item, f"<Properties><Pages>{pages}</Pages></Properties>")
            else:
                target.writestr(item, source.read(item.filename))
    return out.getvalue()
