from unittest.mock import Mock, call

import httpx
import pytest

from ai_processing import brave_search as search
from ai_processing.utils.retry_ai_decorator import retry


def test_retry_returns_immediately_on_success(monkeypatch):
    sleep = Mock()
    monkeypatch.setattr("ai_processing.utils.retry_ai_decorator.time.sleep", sleep)
    operation = Mock(return_value="done")
    assert retry()(operation)("input", option=True) == "done"
    operation.assert_called_once_with("input", option=True)
    sleep.assert_not_called()


def test_retry_recovers_with_exponential_delays(monkeypatch):
    sleep = Mock()
    monkeypatch.setattr("ai_processing.utils.retry_ai_decorator.time.sleep", sleep)
    operation = Mock(side_effect=[RuntimeError("first"), RuntimeError("second"), "done"])
    assert retry(max_attempts=4, delay=0.5, backoff=3)(operation)() == "done"
    assert operation.call_count == 3
    assert sleep.call_args_list == [call(0.5), call(1.5)]


@pytest.mark.parametrize("attempts", [1, 3])
def test_retry_stops_at_limit_and_raises_last_error(monkeypatch, attempts):
    sleep = Mock()
    monkeypatch.setattr("ai_processing.utils.retry_ai_decorator.time.sleep", sleep)
    error = ValueError("still failing")
    operation = Mock(side_effect=error)
    with pytest.raises(ValueError) as caught:
        retry(max_attempts=attempts, delay=1, backoff=2)(operation)()
    assert caught.value is error
    assert operation.call_count == attempts
    assert sleep.call_count == attempts - 1


def test_brave_request_and_response_use_http_contract(monkeypatch):
    requests = []

    def handle(request):
        requests.append(request)
        return httpx.Response(200, json={"web": {"results": [{"title": "Biology", "url": "https://example.com"}]}})

    client = httpx.Client(transport=httpx.MockTransport(handle))
    constructor = Mock(return_value=client)
    monkeypatch.setattr(search.httpx, "Client", constructor)
    brave = search.Brave(api_key="fake-key")
    try:
        response = brave.search("cell biology", count=3, country="US")
        assert response.web_results == [{"title": "Biology", "url": "https://example.com"}]
        request = requests[0]
        assert str(request.url.copy_with(query=None)) == f"{search.Brave.BASE_URL}/web/search"
        assert dict(request.url.params) == {"q": "cell biology", "count": "3", "country": "US"}
        assert constructor.call_args.kwargs["headers"]["X-Subscription-Token"] == "fake-key"
    finally:
        brave.close()
    assert client.is_closed


def test_brave_http_errors_are_raised(monkeypatch):
    client = httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(429)))
    monkeypatch.setattr(search.httpx, "Client", lambda **_: client)
    brave = search.Brave(api_key="fake-key")
    try:
        with pytest.raises(httpx.HTTPStatusError):
            brave.search("biology")
    finally:
        brave.close()


def test_missing_search_categories_have_safe_defaults():
    response = search.BraveSearchResponse({"web": None})
    assert response.web_results == response.news_results == response.video_results == response.discussion_results == []
    assert response.infobox is None


def test_ground_search_filters_incomplete_results_and_closes_client(monkeypatch):
    brave = Mock()
    brave.search.return_value.web_results = [
        {"title": "Biology", "url": "https://example.com"},
        {"title": None, "url": "https://invalid.example"},
        {"title": "Missing URL"},
        {"title": "Chemistry", "url": "https://example.org"},
    ]
    monkeypatch.setattr(search, "Brave", lambda: brave)
    assert search.ground_brave_search("science") == "Biology\nhttps://example.com\n\nChemistry\nhttps://example.org"
    brave.search.assert_called_once_with(q="science", count=10)
    brave.close.assert_called_once()


def test_ground_search_closes_each_failed_attempt(monkeypatch):
    clients = [Mock() for _ in range(5)]
    for client in clients:
        client.search.side_effect = RuntimeError("offline")
    monkeypatch.setattr(search, "Brave", Mock(side_effect=clients))
    sleep = Mock()
    monkeypatch.setattr("ai_processing.utils.retry_ai_decorator.time.sleep", sleep)
    with pytest.raises(RuntimeError, match="offline"):
        search.ground_brave_search("science")
    for client in clients:
        client.close.assert_called_once()
    assert sleep.call_count == 4
