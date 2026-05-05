"""
NewsAPI.org collector (optional, requires API key).
Falls back gracefully if no key is configured.
Docs: https://newsapi.org/docs
"""
import hashlib
import time
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import json
from pathlib import Path
import sys
import yaml

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.classifier import classify

_BASE = "https://newsapi.org/v2/everything"


def _load_config():
    cfg_path = Path(__file__).parent.parent / "config.yaml"
    with open(cfg_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _uid(url: str, title: str) -> str:
    return hashlib.md5(f"{url}{title}".encode()).hexdigest()


def _search(query: str, api_key: str, from_date: str, max_results: int = 30) -> list[dict]:
    params = (
        f"q={query.replace(' ', '+')}"
        f"&from={from_date}"
        f"&sortBy=relevancy"
        f"&pageSize={min(max_results, 100)}"
        f"&language=en"
        f"&apiKey={api_key}"
    )
    url = f"{_BASE}?{params}"
    try:
        req = Request(url, headers={"User-Agent": "FoodIntelBot/1.0"})
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"[NewsAPI] Error for '{query}': {e}")
        return []

    articles = data.get("articles", [])
    items = []
    for a in articles:
        title = a.get("title") or ""
        url = a.get("url") or ""
        description = a.get("description") or ""
        content = a.get("content") or ""
        published = a.get("publishedAt") or datetime.now(timezone.utc).isoformat()
        source_name = a.get("source", {}).get("name", "NewsAPI")

        items.append({
            "uid": _uid(url, title),
            "title": title,
            "summary": description[:1000],
            "url": url,
            "source": source_name,
            "region": "global",
            "language": "en",
            "published_at": published,
            "raw_content": f"{description} {content}"[:3000],
        })
    return items


def collect_newsapi() -> list[dict]:
    cfg = _load_config()
    api_key = cfg.get("newsapi", {}).get("key", "").strip()
    if not api_key:
        print("[NewsAPI] No API key configured — skipping.")
        return []

    from_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    max_items = cfg["system"]["max_articles_per_feed"]

    queries = [
        "food additives regulation",
        "sweetener market erythritol stevia",
        "food color natural colorant",
        "food flavor fragrance market",
        "novel food ingredient functional",
        "EFSA FDA food approval",
    ]

    all_items = []
    for q in queries:
        print(f"[NewsAPI] Searching: {q}")
        items = _search(q, api_key, from_date, max_items)
        classified = [classify(it) for it in items]
        all_items.extend(classified)
        time.sleep(0.3)

    return all_items
