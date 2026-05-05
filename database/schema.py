"""
Database initialization and schema for food additives market intelligence.
"""
import sqlite3
from pathlib import Path


def get_connection(db_path: str) -> sqlite3.Connection:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path: str):
    conn = get_connection(db_path)
    conn.executescript("""
        -- 核心情报条目表
        CREATE TABLE IF NOT EXISTS intelligence (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            uid         TEXT UNIQUE NOT NULL,          -- URL hash, 防重复
            title       TEXT NOT NULL,
            summary     TEXT,
            url         TEXT,
            source      TEXT,
            region      TEXT,                          -- china/eu/usa/sea/mea/global
            category    TEXT,                          -- sweeteners/colorants/flavors/functional/general
            item_type   TEXT DEFAULT 'news',           -- news/regulatory/market/competitor
            language    TEXT DEFAULT 'en',
            published_at TEXT,
            fetched_at  TEXT DEFAULT (datetime('now')),
            relevance   REAL DEFAULT 0.0,             -- 0~1 关键词匹配得分
            tags        TEXT,                          -- JSON array
            raw_content TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_intel_region    ON intelligence(region);
        CREATE INDEX IF NOT EXISTS idx_intel_category  ON intelligence(category);
        CREATE INDEX IF NOT EXISTS idx_intel_type      ON intelligence(item_type);
        CREATE INDEX IF NOT EXISTS idx_intel_published ON intelligence(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_intel_relevance ON intelligence(relevance DESC);

        -- 监管追踪表（重要法规单独记录）
        CREATE TABLE IF NOT EXISTS regulatory_tracker (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            regulator    TEXT,                         -- FDA/EFSA/NHSA/SAMR...
            region       TEXT,
            category     TEXT,
            status       TEXT DEFAULT 'draft',         -- draft/proposed/final/withdrawn
            effective_date TEXT,
            summary      TEXT,
            url          TEXT,
            intel_id     INTEGER REFERENCES intelligence(id),
            created_at   TEXT DEFAULT (datetime('now')),
            updated_at   TEXT DEFAULT (datetime('now'))
        );

        -- 采集日志
        CREATE TABLE IF NOT EXISTS fetch_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            source_name TEXT,
            source_url  TEXT,
            fetched_at  TEXT DEFAULT (datetime('now')),
            items_found INTEGER DEFAULT 0,
            items_new   INTEGER DEFAULT 0,
            status      TEXT DEFAULT 'ok',            -- ok/error/timeout
            error_msg   TEXT
        );

        -- 统计快照（用于趋势图）
        CREATE TABLE IF NOT EXISTS stats_snapshot (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_at TEXT DEFAULT (datetime('now', 'start of day')),
            region      TEXT,
            category    TEXT,
            item_count  INTEGER DEFAULT 0,
            UNIQUE(snapshot_at, region, category)
        );
    """)
    conn.commit()
    conn.close()
    print(f"[DB] Database initialized: {db_path}")
