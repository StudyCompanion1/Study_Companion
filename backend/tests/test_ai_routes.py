from pathlib import Path
from unittest.mock import Mock

import pytest

from app import main


@pytest.fixture(autouse=True)
def isolate_providers(monkeypatch):
    monkeypatch.setattr(main, "analyze_pdf", Mock(side_effect=AssertionError("Unexpected AI request")))
    monkeypatch.setattr(main, "generate_study_guide", Mock(side_effect=AssertionError("Unexpected AI request")))
    monkeypatch.setattr(main, "ground_brave_search", Mock(side_effect=AssertionError("Unexpected search request")))


@pytest.mark.parametrize("route,processor", [
    ("/api/analyze", "analyze_pdf"), ("/api/study-guide", "generate_study_guide"),
])
def test_ai_upload_passes_file_to_processor_and_removes_temporary_copy(client, monkeypatch, route, processor):
    paths = []

    def process(filename):
        path = Path(filename)
        paths.append(path)
        assert path.suffix == ".txt"
        assert path.read_bytes() == b"Biology notes"
        return "Study output"

    mock = Mock(side_effect=process)
    monkeypatch.setattr(main, processor, mock)
    response = client.post(route, files={"file": ("notes.txt", b"Biology notes", "text/plain")})
    assert response.status_code == 200
    assert response.json() == {"result": "Study output"}
    mock.assert_called_once()
    assert not paths[0].exists()


@pytest.mark.parametrize("route", ["/api/analyze", "/api/study-guide"])
def test_ai_upload_rejects_unsupported_and_oversized_files_before_processing(client, monkeypatch, route):
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 4)
    unsupported = client.post(route, files={"file": ("run.exe", b"x")})
    oversized = client.post(route, files={"file": ("notes.txt", b"12345")})
    assert unsupported.status_code == 400
    assert oversized.status_code == 413
    main.analyze_pdf.assert_not_called()
    main.generate_study_guide.assert_not_called()


def test_reader_error_returns_bad_request_and_cleans_up(client, monkeypatch):
    paths = []

    def invalid(filename):
        paths.append(Path(filename))
        raise ValueError("No readable text was found")

    monkeypatch.setattr(main, "analyze_pdf", invalid)
    response = client.post("/api/analyze", files={"file": ("empty.txt", b" ")})
    assert response.status_code == 400
    assert "No readable text" in response.json()["detail"]
    assert not paths[0].exists()


def test_search_route_passes_query_and_rejects_empty_queries(client, monkeypatch):
    search = Mock(return_value="Biology\nhttps://example.com")
    monkeypatch.setattr(main, "ground_brave_search", search)
    response = client.post("/api/url-resources", params={"query": "cell biology"})
    assert response.status_code == 200
    assert response.json() == "Biology\nhttps://example.com"
    search.assert_called_once_with("cell biology")
    assert client.post("/api/url-resources").status_code == 422
    assert client.post("/api/url-resources", params={"query": ""}).status_code == 422
    assert search.call_count == 1
