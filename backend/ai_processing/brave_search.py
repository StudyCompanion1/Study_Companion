import os
import httpx
from dotenv import load_dotenv
from pathlib import Path
from ai_processing.utils.retry_ai_decorator import retry
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


class Brave:
    BASE_URL = "https://api.search.brave.com/res/v1"

    def __init__(self, api_key=os.getenv("BRAVE_API_KEY")):
        self.api_key = api_key

        self.client = httpx.Client(
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": self.api_key,
            },
            timeout=20.0,
        )

    def search(self, q, count=10, **kwargs):
        response = self.client.get(
            f"{self.BASE_URL}/web/search",
            params={
                "q": q,
                "count": count,
                **kwargs,
            },
        )

        response.raise_for_status()
        return BraveSearchResponse(response.json())

    def close(self):
        self.client.close()


class BraveSearchResponse:
    def __init__(self, data):
        self.raw = data

        self.web_results = (data.get("web") or {}).get("results", [])

        self.news_results = (data.get("news") or {}).get("results", [])

        self.video_results = (data.get("videos") or {}).get("results", [])

        self.discussion_results = (data.get("discussions") or {}).get("results", [])

        self.infobox = data.get("infobox")

@retry(max_attempts=5, delay=1.1, backoff=2.0)
def ground_brave_search(input):
    brave = Brave()

    num_results = 10

    try:
        search_results = brave.search(q=input, count=num_results)

        web_results = search_results.web_results

        results_list = []

        for result in web_results:
            title = result.get("title")
            url = result.get("url")
            if isinstance(title, str) and isinstance(url, str):
                results_list.append(f"{title}\n{url}")
    finally:
        brave.close()

    final_result = "\n\n".join(results_list)
    return final_result
