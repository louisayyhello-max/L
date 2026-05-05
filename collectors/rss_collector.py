"""
RSS/Atom feed collector for food additives market intelligence.
Supports trade media and regulatory RSS feeds defined in config.yaml.
"""
import hashlib
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

import yaml
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.classifier import classify


_USER_AGENT = (
    "Mozilla/5.0 (compatible; FoodIntelBot/1.0; market intelligence research)"
)

_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "media": "http://search.yahoo.com/mrss/",
}


def _load_config():
    cfg_path = Path(__file__).parent.parent / "config.yaml"
    with open(cfg_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _fetch_feed(url: str, timeout: int = 15) -> bytes | None:
    try:
        req = Request(url, headers={
            "User-Agent": _USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9,zh;q=0.8",
        })
        with urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"[RSS] Failed to fetch {url}: {type(e).__name__}: {e}")
        return None


def _uid(url: str, title: str) -> str:
    return hashlib.md5(f"{url}{title}".encode()).hexdigest()


def _parse_date(date_str: str | None) -> str:
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    # Common formats
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S GMT",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]:
        try:
            return datetime.strptime(date_str.strip(), fmt).isoformat()
        except ValueError:
            continue
    return date_str


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").strip()


def _parse_rss(content: bytes, source_name: str, region: str, max_items: int) -> list[dict]:
    items = []
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"[RSS] Parse error for {source_name}: {e}")
        return items

    # Determine feed type: RSS or Atom
    is_atom = root.tag in ("{http://www.w3.org/2005/Atom}feed", "feed")

    if is_atom:
        entries = root.findall("{http://www.w3.org/2005/Atom}entry")
        for entry in entries[:max_items]:
            title_el = entry.find("{http://www.w3.org/2005/Atom}title")
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            summary_el = entry.find("{http://www.w3.org/2005/Atom}summary")
            content_el = entry.find("{http://www.w3.org/2005/Atom}content")
            date_el = entry.find("{http://www.w3.org/2005/Atom}updated") or \
                      entry.find("{http://www.w3.org/2005/Atom}published")

            title = title_el.text if title_el is not None else ""
            url = link_el.get("href", "") if link_el is not None else ""
            summary = _strip_html((summary_el.text if summary_el is not None else "") or
                                  (content_el.text if content_el is not None else ""))

            items.append({
                "uid": _uid(url, title),
                "title": title,
                "summary": summary[:1000],
                "url": url,
                "source": source_name,
                "region": region,
                "language": "en",
                "published_at": _parse_date(date_el.text if date_el is not None else None),
                "raw_content": summary[:3000],
            })
    else:
        # RSS 2.0
        channel = root.find("channel")
        if channel is None:
            return items
        for entry in channel.findall("item")[:max_items]:
            title = (entry.findtext("title") or "").strip()
            url = (entry.findtext("link") or "").strip()
            desc = entry.findtext("description") or ""
            content_encoded = entry.findtext(
                "{http://purl.org/rss/1.0/modules/content/}encoded") or ""
            date_str = entry.findtext("pubDate") or entry.findtext(
                "{http://purl.org/dc/elements/1.1/}date")
            summary = _strip_html(content_encoded or desc)

            items.append({
                "uid": _uid(url, title),
                "title": title,
                "summary": summary[:1000],
                "url": url,
                "source": source_name,
                "region": region,
                "language": "en",
                "published_at": _parse_date(date_str),
                "raw_content": summary[:3000],
            })

    return items


def _fetch_google_news_rss(query: str, lang: str, max_items: int) -> list[dict]:
    encoded = query.replace(" ", "+")
    url = f"https://news.google.com/rss/search?q={encoded}&hl={lang}&gl=US&ceid=US:{lang[:2].upper()}"
    content = _fetch_feed(url)
    if not content:
        return []
    region = "china" if lang.startswith("zh") else "global"
    items = _parse_rss(content, f"Google News: {query}", region, max_items)
    # Google News links need cleanup
    for item in items:
        item["language"] = "zh" if lang.startswith("zh") else "en"
    return items


def collect_rss(db_path: str) -> tuple[list[dict], list[dict]]:
    cfg = _load_config()
    max_items = cfg["system"]["max_articles_per_feed"]
    all_items = []
    logs = []

    rss_cfg = cfg.get("rss_feeds", {})

    # Trade media and regulatory feeds
    for feed_group in ["trade_media", "regulators"]:
        for feed in rss_cfg.get(feed_group, []):
            name = feed["name"]
            url = feed["url"]
            region = feed.get("region", "global")
            print(f"[RSS] Fetching: {name}")

            start = time.time()
            content = _fetch_feed(url)
            elapsed = round(time.time() - start, 2)

            if content is None:
                logs.append({"source_name": name, "source_url": url,
                             "status": "error", "error_msg": "fetch failed",
                             "items_found": 0, "items_new": 0})
                continue

            items = _parse_rss(content, name, region, max_items)
            classified = [classify(it) for it in items]
            all_items.extend(classified)

            logs.append({"source_name": name, "source_url": url,
                         "status": "ok", "items_found": len(items),
                         "items_new": 0})  # items_new filled by DB insert
            time.sleep(0.5)  # polite delay

    # Google News keyword searches
    for topic in rss_cfg.get("google_news_topics", []):
        query = topic["query"]
        lang = topic.get("lang", "en")
        print(f"[RSS] Google News: {query}")
        items = _fetch_google_news_rss(query, lang, max_items)
        classified = [classify(it) for it in items]
        all_items.extend(classified)
        logs.append({"source_name": f"Google News: {query}", "source_url": "",
                     "status": "ok", "items_found": len(items), "items_new": 0})
        time.sleep(1.0)

    return all_items, logs
