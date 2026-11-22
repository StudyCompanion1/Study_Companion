"""Reads an uploaded file page by page for the material view (viewer.py): how many pages it has,
the text on each slide, and pictures of PDF pages. No AI runs here, so it works without a
Gemini key.

What each file type shows on the left of the material view:
- PDF: a picture of each page
- PowerPoint: the text of each slide (pictures of slides would need PowerPoint or LibreOffice
  installed on the server)
- Word and text files: all of the text as one section
- Images: the image
"""

import io
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path

import pymupdf
from docx import Document
from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

from app.models import FileType

PDF_ZOOM = 1.5  # 1.0 = 72 dpi, which is blurry on most screens
MAX_TEXT_CHARS = 200_000  # a huge text file is cut off so the page stays usable
MAX_IMAGE_SIDE = 2400  # images the browser can't show are converted to PNG at most this big
BROWSER_IMAGE_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "GIF": "image/gif"}


@dataclass
class Page:
    number: int  # 1-based
    text: str | None = None  # shown when the page has no picture
    width: int | None = None  # picture size in pixels, so the browser can save room before it loads
    height: int | None = None


def count_pages(path: str | Path, file_type: FileType) -> int | None:
    """Pages or slides, for the Length column. None when the type has no pages or the file is
    unreadable; an upload never fails because of this."""
    try:
        if file_type == FileType.PDF:
            with pymupdf.open(path) as pdf:
                return pdf.page_count
        if file_type == FileType.PPT:
            return len(Presentation(str(path)).slides)
        if file_type == FileType.DOCX:
            return _word_page_count(path)
    except Exception:  # noqa: BLE001  (any unreadable upload just has no count)
        return None
    return None


def read_pages(path: Path, file_type: FileType) -> list[Page]:
    """Every page of the file. Raises if the file can't be read."""
    if file_type == FileType.PDF:
        with pymupdf.open(path) as pdf:
            return [
                Page(i + 1, width=round(p.rect.width * PDF_ZOOM), height=round(p.rect.height * PDF_ZOOM))
                for i, p in enumerate(pdf)
            ]
    if file_type == FileType.PPT:
        slides = Presentation(str(path)).slides
        return [Page(i + 1, text="\n".join(_shape_texts(slide.shapes))) for i, slide in enumerate(slides)]
    if file_type == FileType.DOCX:
        text = "\n".join(paragraph.text for paragraph in Document(str(path)).paragraphs)
        return [Page(1, text=text.strip()[:MAX_TEXT_CHARS])]
    if file_type == FileType.TXT:
        return [Page(1, text=path.read_text(encoding="utf-8", errors="replace")[:MAX_TEXT_CHARS])]
    with Image.open(path) as image:
        return [Page(1, width=image.width, height=image.height)]


def page_image(path: Path, file_type: FileType, number: int) -> tuple[bytes, str]:
    """(picture bytes, media type) for one page. Raises IndexError for a page that doesn't exist
    and ValueError for a type that has no pictures."""
    if file_type == FileType.PDF:
        with pymupdf.open(path) as pdf:
            if not 1 <= number <= pdf.page_count:
                raise IndexError(number)
            pixmap = pdf[number - 1].get_pixmap(matrix=pymupdf.Matrix(PDF_ZOOM, PDF_ZOOM))
            return pixmap.tobytes("png"), "image/png"
    if file_type == FileType.IMAGE:
        if number != 1:
            raise IndexError(number)
        with Image.open(path) as image:
            if image.format in BROWSER_IMAGE_TYPES:
                return path.read_bytes(), BROWSER_IMAGE_TYPES[image.format]
            image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            buffer = io.BytesIO()
            image.convert("RGBA").save(buffer, format="PNG")
            return buffer.getvalue(), "image/png"
    raise ValueError(f"{file_type} has no page pictures")


def _shape_texts(shapes):
    """The text on a slide, top-level shapes first, with grouped shapes and tables included."""
    for shape in shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from _shape_texts(shape.shapes)
        elif shape.has_text_frame and shape.text_frame.text.strip():
            yield shape.text_frame.text.strip().replace("\v", "\n")  # \v = a line break inside a paragraph
        elif getattr(shape, "has_table", False):
            for row in shape.table.rows:
                yield " | ".join(cell.text.strip() for cell in row.cells)


def _word_page_count(path: str | Path) -> int | None:
    """Word saves its last page count in docProps/app.xml; python-docx doesn't read it."""
    with zipfile.ZipFile(path) as package:
        try:
            properties = package.read("docProps/app.xml").decode("utf-8", errors="replace")
        except KeyError:
            return None
    match = re.search(r"<Pages>(\d+)</Pages>", properties)
    return int(match.group(1)) if match else None
