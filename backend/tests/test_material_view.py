"""The material view (app/materials/viewer.py and pages.py): opening a file and showing its pages."""

import uuid
from unittest.mock import patch

import pytest
from sqlmodel import select

from app import storage
from app.models import CourseMaterial, FileType
from tests.material_files import docx_bytes, image_bytes, pdf_bytes, pptx_bytes, uploads  # noqa: F401
from tests.materials_helpers import MATERIALS, UPLOAD_FILE, new_collection, register


def upload(client, name, content, collection_id=None):
    data = {"collection_id": collection_id} if collection_id else None
    res = client.post(MATERIALS, files={"file": (name, content, "application/octet-stream")}, data=data)
    assert res.status_code == 201, res.text
    return res.json()


def test_upload_records_length_and_file_name(client, uploads):
    register(client)

    pdf = upload(client, "Week 1.pdf", pdf_bytes(3))
    slides = upload(client, "Cells.pptx", pptx_bytes())
    word = upload(client, "Lab.docx", docx_bytes(pages=4))
    no_count = upload(client, "Old.docx", docx_bytes(pages=None))
    text = upload(client, "todo.txt", b"read chapter 2")

    assert (pdf["page_count"], pdf["file_name"], pdf["last_opened_at"]) == (3, "Week 1.pdf", None)
    assert [slides["page_count"], word["page_count"], no_count["page_count"], text["page_count"]] == [2, 4, None, None]


def test_an_unreadable_file_still_uploads_without_a_length(client, uploads):
    register(client)

    material = upload(client, "broken.pdf", b"%PDF-1.4 not really")

    assert material["page_count"] is None


def test_opening_a_file_marks_it_opened(client, uploads):
    register(client)
    material = upload(client, "Week 1.pdf", pdf_bytes(1))

    opened = client.post(f"{MATERIALS}/{material['id']}/open")

    assert opened.status_code == 200
    assert opened.json()["last_opened_at"].endswith("Z")
    assert client.get(f"{MATERIALS}/{material['id']}").json()["last_opened_at"] == opened.json()["last_opened_at"]


def test_someone_elses_file_is_not_found(client, uploads):
    register(client)
    material = upload(client, "mine.pdf", pdf_bytes(1))
    client.post("/api/auth/logout")
    register(client, email="sam@example.com")

    for res in (
        client.get(f"{MATERIALS}/{material['id']}"),
        client.post(f"{MATERIALS}/{material['id']}/open"),
        client.get(f"{MATERIALS}/{material['id']}/pages"),
        client.get(f"{MATERIALS}/{material['id']}/pages/1/image"),
        client.get(f"{MATERIALS}/{uuid.uuid4()}"),
    ):
        assert res.status_code == 404


def test_pdf_pages_are_pictures(client, uploads):
    register(client)
    material = upload(client, "Week 1.pdf", pdf_bytes(2))

    pages = client.get(f"{MATERIALS}/{material['id']}/pages").json()
    picture = client.get(f"{MATERIALS}/{material['id']}/pages/2/image")

    assert [(p["number"], p["image"], p["text"]) for p in pages] == [(1, True, None), (2, True, None)]
    assert (pages[0]["width"], pages[0]["height"]) == (300, 150)  # 200 x 100 at 1.5x
    assert picture.headers["content-type"] == "image/png"
    assert picture.headers["cache-control"] == "private, max-age=3600"
    assert picture.content.startswith(b"\x89PNG")
    assert client.get(f"{MATERIALS}/{material['id']}/pages/3/image").status_code == 404
    assert client.get(f"{MATERIALS}/{material['id']}/pages/0/image").status_code == 422


def test_slides_show_their_text(client, uploads):
    register(client)
    material = upload(client, "Cells.pptx", pptx_bytes(("Cell structure", "Mitochondria")))

    pages = client.get(f"{MATERIALS}/{material['id']}/pages").json()

    assert [p["number"] for p in pages] == [1, 2]
    assert pages[0]["text"] == "Cell structure\nAbout cell structure"
    assert pages[1]["image"] is False
    assert client.get(f"{MATERIALS}/{material['id']}/pages/1/image").status_code == 404


@pytest.mark.parametrize(
    ("name", "content", "text"),
    [("Lab.docx", docx_bytes(("Lab 2", "Osmosis")), "Lab 2\nOsmosis"), ("todo.txt", b"read chapter 2", "read chapter 2")],
    ids=["word", "text"],
)
def test_word_and_text_files_are_one_section(client, uploads, name, content, text):
    register(client)
    material = upload(client, name, content)

    pages = client.get(f"{MATERIALS}/{material['id']}/pages").json()

    assert pages == [{"number": 1, "text": text, "image": False, "width": None, "height": None}]


@pytest.mark.parametrize(
    ("fmt", "name", "media_type"), [("PNG", "photo.png", "image/png"), ("BMP", "scan.bmp", "image/png")], ids=["png", "bmp"]
)
def test_images_show_as_one_picture(client, uploads, fmt, name, media_type):
    register(client)
    material = upload(client, name, image_bytes(fmt, (40, 30)))

    pages = client.get(f"{MATERIALS}/{material['id']}/pages").json()
    picture = client.get(f"{MATERIALS}/{material['id']}/pages/1/image")

    assert pages == [{"number": 1, "text": None, "image": True, "width": 40, "height": 30}]
    assert picture.headers["content-type"] == media_type  # BMP is converted, browsers can't rely on it
    assert client.get(f"{MATERIALS}/{material['id']}/pages/2/image").status_code == 404


def test_an_unreadable_file_cant_be_previewed(client, uploads):
    register(client)
    material = upload(client, "broken.pdf", b"%PDF-1.4 not really")

    assert client.get(f"{MATERIALS}/{material['id']}/pages").status_code == 422
    assert client.get(f"{MATERIALS}/{material['id']}/pages/1/image").status_code == 422


def test_a_file_missing_from_storage_is_reported(client):
    register(client)
    with patch(UPLOAD_FILE):  # recorded in the database but never stored
        material = client.post(MATERIALS, files={"file": ("gone.pdf", pdf_bytes(1), "application/pdf")}).json()

    res = client.get(f"{MATERIALS}/{material['id']}/pages")

    assert (res.status_code, res.json()["detail"]) == (404, "This file is missing from storage.")


def test_viewing_fills_in_a_missing_page_count(client, session, uploads):
    register(client)
    material = upload(client, "Week 1.pdf", pdf_bytes(2), new_collection(client)["id"])
    row = session.exec(select(CourseMaterial)).one()
    row.page_count = None  # as if uploaded before page counts were recorded
    session.add(row)
    session.commit()

    client.get(f"{MATERIALS}/{material['id']}/pages")

    session.refresh(row)
    assert row.page_count == 2


def test_stored_path_stays_inside_the_uploads_folder(uploads):
    uploads.mkdir()
    (uploads.parent / "secret.txt").write_text("no")

    with pytest.raises(FileNotFoundError):
        storage.stored_path("../secret.txt")
    with pytest.raises(FileNotFoundError):
        storage.stored_path("users/missing.pdf")


def test_page_image_rejects_types_without_pictures(tmp_path):
    from app.materials.pages import page_image

    path = tmp_path / "a.txt"
    path.write_text("hi")
    with pytest.raises(ValueError):
        page_image(path, FileType.TXT, 1)
