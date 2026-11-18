"""Notes in the material view, one per page (app/materials/notes.py)."""

import uuid
from datetime import datetime

import pytest
from sqlmodel import select

from app.materials import notes as notes_module
from app.models import Collection, Note
from tests.material_files import docx_bytes, image_bytes, pdf_bytes, uploads  # noqa: F401
from tests.materials_helpers import MATERIALS, new_collection, register

DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def upload_pdf(client, pages=3, collection_id=None):
    data = {"collection_id": collection_id} if collection_id else None
    files = {"file": ("Week 1.pdf", pdf_bytes(pages), "application/pdf")}
    return client.post(MATERIALS, files=files, data=data).json()


def note_url(material, page):
    return f"{MATERIALS}/{material['id']}/notes/{page}"


def test_notes_need_login(client):
    assert client.get(f"{MATERIALS}/{uuid.uuid4()}/notes").status_code == 401
    assert client.put(f"{MATERIALS}/{uuid.uuid4()}/notes/1", json={"text": "x"}).status_code == 401


def test_save_and_list_notes_by_page(client, uploads):
    register(client)
    material = upload_pdf(client)

    client.put(note_url(material, 3), json={"text": "ATP is made here"})
    saved = client.put(note_url(material, 1), json={"text": "Intro"})
    notes = client.get(f"{MATERIALS}/{material['id']}/notes").json()

    assert saved.status_code == 200
    assert saved.json()["updated_at"].endswith("Z")
    assert [(n["page"], n["text"]) for n in notes] == [(1, "Intro"), (3, "ATP is made here")]


def test_saving_again_updates_the_same_note(client, session, uploads):
    register(client)
    material = upload_pdf(client)

    client.put(note_url(material, 2), json={"text": "first"})
    client.put(note_url(material, 2), json={"text": "second"})

    assert [(n.page, n.text) for n in session.exec(select(Note)).all()] == [(2, "second")]


def test_writing_a_note_counts_as_working_on_the_file(client, session, uploads):
    register(client)
    collection = new_collection(client)
    material = upload_pdf(client, collection_id=collection["id"])
    edited_before = session.get(Collection, uuid.UUID(collection["id"])).updated_at

    client.put(note_url(material, 1), json={"text": "hello"})

    assert client.get(f"{MATERIALS}/{material['id']}").json()["last_opened_at"] is not None
    stored = session.get(Collection, uuid.UUID(collection["id"]))
    assert stored.updated_at.replace(tzinfo=None) > edited_before.replace(tzinfo=None)


def test_pages_outside_the_file_are_rejected(client, uploads):
    register(client)
    material = upload_pdf(client, pages=2)

    assert client.put(note_url(material, 3), json={"text": "x"}).status_code == 404
    assert client.put(note_url(material, 0), json={"text": "x"}).status_code == 422


def test_an_image_takes_one_note(client, uploads):
    register(client)
    material = client.post(MATERIALS, files={"file": ("cell.png", image_bytes(), "image/png")}).json()

    assert client.put(note_url(material, 1), json={"text": "ok"}).status_code == 200
    assert client.put(note_url(material, 2), json={"text": "no"}).status_code == 404


@pytest.mark.parametrize(
    ("name", "content", "kind"),
    [("todo.txt", b"read", "text/plain"), ("Lab 2.docx", docx_bytes(pages=2), DOCX_TYPE)],
    ids=["text", "word"],
)
def test_word_and_text_files_take_added_notes_pages(client, uploads, name, content, kind):
    register(client)
    material = client.post(MATERIALS, files={"file": (name, content, kind)}).json()
    last = notes_module.MAX_ADDED_PAGES

    assert client.put(note_url(material, 3), json={"text": "more"}).status_code == 200
    assert client.put(note_url(material, last), json={"text": "last"}).status_code == 200
    assert client.put(note_url(material, last + 1), json={"text": "too many"}).status_code == 404


def test_saving_a_note_empty_removes_it(client, session, uploads):
    register(client)
    material = upload_pdf(client)
    client.put(note_url(material, 2), json={"text": "first"})

    cleared = client.put(note_url(material, 2), json={"text": ""})
    never_written = client.put(note_url(material, 3), json={"text": ""})

    assert cleared.status_code == never_written.status_code == 200
    assert (cleared.json()["page"], cleared.json()["text"]) == (2, "")
    assert session.exec(select(Note)).all() == []
    assert client.get(f"{MATERIALS}/{material['id']}/notes").json() == []
    assert client.get(f"{MATERIALS}/{material['id']}").json()["last_opened_at"] is not None


def test_note_text_is_checked(client, uploads):
    register(client)
    material = upload_pdf(client)

    too_long = client.put(note_url(material, 1), json={"text": "x" * (notes_module.MAX_NOTE_CHARS + 1)})
    extra = client.put(note_url(material, 1), json={"text": "x", "page": 2})

    assert (too_long.status_code, extra.status_code) == (422, 422)


def test_cannot_read_or_write_someone_elses_notes(client, uploads):
    register(client)
    material = upload_pdf(client)
    client.put(note_url(material, 1), json={"text": "private"})
    client.post("/api/auth/logout")
    register(client, email="sam@example.com")

    assert client.get(f"{MATERIALS}/{material['id']}/notes").status_code == 404
    assert client.put(note_url(material, 1), json={"text": "mine now"}).status_code == 404


def test_two_first_saves_at_once_end_as_one_note(client, session, uploads, monkeypatch):
    register(client)
    material = upload_pdf(client)
    client.put(note_url(material, 1), json={"text": "from the other save"})
    real_find, calls = notes_module._find, []

    def find_misses_once(*args):
        calls.append(args)
        return None if len(calls) == 1 else real_find(*args)  # the first look happens "before" the other save

    monkeypatch.setattr(notes_module, "_find", find_misses_once)
    res = client.put(note_url(material, 1), json={"text": "latest"})

    assert res.status_code == 200
    assert [(n.page, n.text) for n in session.exec(select(Note)).all()] == [(1, "latest")]
    assert isinstance(datetime.fromisoformat(res.json()["updated_at"]), datetime)
