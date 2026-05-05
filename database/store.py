"""
Persist classified intelligence items to SQLite and update stats snapshots.
"""
import json
import sqlite3
from datetime import datetime, timezone

from .schema import get_connection


def insert_items(db_path: str, items: list[dict]) -> int:
    conn = get_connection(db_path)
    new_count = 0
    for item in items:
        try:
            tags = json.dumps(item.get("tags", []), ensure_ascii=False)
            conn.execute("""
                INSERT OR IGNORE INTO intelligence
                    (uid, title, summary, url, source, region, category,
                     item_type, language, published_at, relevance, tags, raw_content)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                item.get("uid"),
                item.get("title", ""),
                item.get("summary", ""),
                item.get("url", ""),
                item.get("source", ""),
                item.get("region", "global"),
                item.get("category", "general"),
                item.get("item_type", "news"),
                item.get("language", "en"),
                item.get("published_at"),
                item.get("relevance", 0.0),
                tags,
                item.get("raw_content", ""),
            ))
            if conn.execute("SELECT changes()").fetchone()[0]:
                new_count += 1
        except sqlite3.Error as e:
            print(f"[DB] Insert error: {e} — {item.get('title', '')[:60]}")
    conn.commit()
    conn.close()
    return new_count


def insert_logs(db_path: str, logs: list[dict]):
    conn = get_connection(db_path)
    for log in logs:
        conn.execute("""
            INSERT INTO fetch_log (source_name, source_url, items_found, items_new, status, error_msg)
            VALUES (?,?,?,?,?,?)
        """, (
            log.get("source_name"),
            log.get("source_url"),
            log.get("items_found", 0),
            log.get("items_new", 0),
            log.get("status", "ok"),
            log.get("error_msg"),
        ))
    conn.commit()
    conn.close()


def update_stats(db_path: str):
    conn = get_connection(db_path)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = conn.execute("""
        SELECT region, category, COUNT(*) as cnt
        FROM intelligence
        WHERE date(published_at) >= date('now', '-30 days')
        GROUP BY region, category
    """).fetchall()
    for row in rows:
        conn.execute("""
            INSERT INTO stats_snapshot (snapshot_at, region, category, item_count)
            VALUES (?,?,?,?)
            ON CONFLICT(snapshot_at, region, category) DO UPDATE SET item_count=excluded.item_count
        """, (today, row["region"], row["category"], row["cnt"]))
    conn.commit()
    conn.close()


def purge_old(db_path: str, retention_days: int):
    conn = get_connection(db_path)
    conn.execute("""
        DELETE FROM intelligence
        WHERE julianday('now') - julianday(published_at) > ?
    """, (retention_days,))
    deleted = conn.execute("SELECT changes()").fetchone()[0]
    conn.commit()
    conn.close()
    if deleted:
        print(f"[DB] Purged {deleted} old records.")


def query_dashboard_data(db_path: str) -> dict:
    conn = get_connection(db_path)

    # Recent high-relevance items
    recent = conn.execute("""
        SELECT id, title, summary, url, source, region, category, item_type,
               language, published_at, relevance
        FROM intelligence
        WHERE relevance > 0.1
        ORDER BY published_at DESC
        LIMIT 500
    """).fetchall()

    # Category counts (last 30 days)
    cat_counts = conn.execute("""
        SELECT category, COUNT(*) as cnt
        FROM intelligence
        WHERE date(published_at) >= date('now', '-30 days')
        GROUP BY category
        ORDER BY cnt DESC
    """).fetchall()

    # Region counts (last 30 days)
    region_counts = conn.execute("""
        SELECT region, COUNT(*) as cnt
        FROM intelligence
        WHERE date(published_at) >= date('now', '-30 days')
        GROUP BY region
        ORDER BY cnt DESC
    """).fetchall()

    # Regulatory items
    regulatory = conn.execute("""
        SELECT id, title, summary, url, source, region, category, published_at
        FROM intelligence
        WHERE item_type = 'regulatory'
        ORDER BY published_at DESC
        LIMIT 100
    """).fetchall()

    # Fetch log summary
    fetch_log = conn.execute("""
        SELECT source_name, fetched_at, items_found, items_new, status
        FROM fetch_log
        ORDER BY fetched_at DESC
        LIMIT 50
    """).fetchall()

    # Daily trend (last 60 days)
    trend = conn.execute("""
        SELECT date(published_at) as day, category, COUNT(*) as cnt
        FROM intelligence
        WHERE date(published_at) >= date('now', '-60 days')
        GROUP BY day, category
        ORDER BY day
    """).fetchall()

    conn.close()

    return {
        "recent": [dict(r) for r in recent],
        "cat_counts": [dict(r) for r in cat_counts],
        "region_counts": [dict(r) for r in region_counts],
        "regulatory": [dict(r) for r in regulatory],
        "fetch_log": [dict(r) for r in fetch_log],
        "trend": [dict(r) for r in trend],
    }
