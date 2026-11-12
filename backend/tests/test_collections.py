import uuid

import pytest


COLLECTIONS = "/api/collections"
PASSWORD = "correct-horse-battery"


def register(client, email="maya@example.com"):
    response = client.post("/api/auth/register", json={"name": "Student", "email": email, "password": PASSWORD})
    assert response.status_code == 201


def test_collections_require_login(client):
    assert client.get(COLLECTIONS).status_code == 401
    assert client.post(COLLECTIONS, json={"name": "Biology"}).status_code == 401
    assert client.get(f"{COLLECTIONS}/{uuid.uuid4()}").status_code == 401


def test_created_collection_is_empty_and_persists_after_login(client):
    register(client)
    assert client.get(COLLECTIONS).json() == []

    response = client.post(COLLECTIONS, json={"name": "  Biology  "})

    assert response.status_code == 201
    collection = response.json()
    assert collection["name"] == "Biology"
    assert collection["code"] is None
    assert collection["term"] is None
    assert collection["note_count"] == 0
    assert collection["updated_at"].endswith("Z")

    assert client.post("/api/auth/logout").status_code == 204
    assert client.post("/api/auth/login", json={"email": "maya@example.com", "password": PASSWORD}).status_code == 200
    assert client.get(COLLECTIONS).json() == [collection]
    assert client.get(f"{COLLECTIONS}/{collection['id']}").json() == collection


def test_collections_are_private_to_their_owner(client):
    register(client)
    created = client.post(COLLECTIONS, json={"name": "Biology", "code": " BIO 201 ", "term": " Fall 2026 "})
    assert created.status_code == 201
    collection = created.json()
    assert collection["code"] == "BIO 201"
    assert collection["term"] == "Fall 2026"

    register(client, email="sam@example.com")

    assert client.get(COLLECTIONS).json() == []
    assert client.get(f"{COLLECTIONS}/{collection['id']}").status_code == 404
    assert client.get(f"{COLLECTIONS}/invalid-id").status_code == 404


@pytest.mark.parametrize("body", [
    {"name": " \t "},
    {"name": "x" * 101},
    {"name": "Biology", "user_id": str(uuid.uuid4())},
    {"name": "Biology", "notes": [{"text": "Injected note"}]},
])
def test_create_rejects_invalid_input(client, body):
    register(client)

    assert client.post(COLLECTIONS, json=body).status_code == 422
    assert client.get(COLLECTIONS).json() == []
