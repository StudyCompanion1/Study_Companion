"""Putting a collection's files in order (app/materials/order.py), and the file count on each
collection (app/collections.py)."""

import uuid
from unittest.mock import patch

from tests.materials_helpers import MATERIALS, UPLOAD_FILE, new_collection, pdf, register

ORDER = f"{MATERIALS}/order"


def upload_titles(client, collection_id, *titles):
    with patch(UPLOAD_FILE):
        return [
            client.post(MATERIALS, files=pdf(f"{title}.pdf"), data={"collection_id": collection_id}).json()
            for title in titles
        ]


def titles_in(client, collection_id):
    return [m["title"] for m in client.get(MATERIALS, params={"collection_id": collection_id}).json()]


def test_new_uploads_go_on_top(client):
    register(client)
    biology = new_collection(client)

    upload_titles(client, biology["id"], "Week 1", "Week 2", "Week 3")

    assert titles_in(client, biology["id"]) == ["Week 3", "Week 2", "Week 1"]


def test_reorder_saves_the_new_order(client):
    register(client)
    biology = new_collection(client)
    week1, week2, week3 = upload_titles(client, biology["id"], "Week 1", "Week 2", "Week 3")

    res = client.put(ORDER, json={"collection_id": biology["id"], "material_ids": [week1["id"], week3["id"], week2["id"]]})
    upload_titles(client, biology["id"], "Week 4")

    assert res.status_code == 204
    assert titles_in(client, biology["id"]) == ["Week 4", "Week 1", "Week 3", "Week 2"]


def test_reorder_must_list_every_file_once(client):
    register(client)
    biology = new_collection(client)
    week1, week2 = upload_titles(client, biology["id"], "Week 1", "Week 2")

    for ids in ([week1["id"]], [week1["id"], week1["id"]], [week1["id"], week2["id"], str(uuid.uuid4())]):
        res = client.put(ORDER, json={"collection_id": biology["id"], "material_ids": ids})
        assert res.status_code == 409

    assert titles_in(client, biology["id"]) == ["Week 2", "Week 1"]


def test_cannot_reorder_someone_elses_collection(client):
    register(client)
    theirs = new_collection(client)
    (week1,) = upload_titles(client, theirs["id"], "Week 1")
    client.post("/api/auth/logout")
    register(client, email="sam@example.com")

    res = client.put(ORDER, json={"collection_id": theirs["id"], "material_ids": [week1["id"]]})

    assert res.status_code == 404
    assert client.put(ORDER, json={"material_ids": []}).status_code == 422


def test_collections_count_their_files(client):
    register(client)
    biology = new_collection(client, "Biology")
    chemistry = new_collection(client, "Chemistry")
    upload_titles(client, biology["id"], "Week 1", "Week 2")

    counts = {c["name"]: c["note_count"] for c in client.get("/api/collections").json()}

    assert counts == {"Biology": 2, "Chemistry": 0}
    assert client.get(f"/api/collections/{biology['id']}").json()["note_count"] == 2
    assert client.get(f"/api/collections/{chemistry['id']}").json()["note_count"] == 0
