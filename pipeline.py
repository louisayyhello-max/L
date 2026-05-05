#!/usr/bin/env python3
"""
Food Additives Market Intelligence Pipeline
Usage:
  python pipeline.py           # full run: collect + build dashboard
  python pipeline.py --collect # collect only
  python pipeline.py --build   # build dashboard only (no network)
  python pipeline.py --stats   # print database statistics
"""
import argparse
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))


def load_config():
    with open("config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def run_collect(cfg):
    from collectors.rss_collector import collect_rss
    from collectors.newsapi_collector import collect_newsapi
    from database.store import insert_items, insert_logs, update_stats, purge_old

    db_path = cfg["system"]["db_path"]
    retention = cfg["system"]["article_retention_days"]

    print("\n=== [1/4] Collecting RSS feeds ===")
    rss_items, rss_logs = collect_rss(db_path)
    print(f"    Collected {len(rss_items)} items from RSS")

    print("\n=== [2/4] Collecting NewsAPI ===")
    newsapi_items = collect_newsapi()
    print(f"    Collected {len(newsapi_items)} items from NewsAPI")

    all_items = rss_items + newsapi_items

    print("\n=== [3/4] Storing to database ===")
    new_count = insert_items(db_path, all_items)
    insert_logs(db_path, rss_logs)
    update_stats(db_path)
    purge_old(db_path, retention)
    print(f"    {new_count} new items stored (total collected: {len(all_items)})")

    return new_count


def run_build(cfg):
    from dashboard.build import build_dashboard

    db_path = cfg["system"]["db_path"]
    dashboard_path = cfg["system"]["dashboard_path"]

    print("\n=== Building dashboard ===")
    build_dashboard(db_path, dashboard_path)


def run_stats(cfg):
    from database.schema import get_connection

    db_path = cfg["system"]["db_path"]
    conn = get_connection(db_path)

    total = conn.execute("SELECT COUNT(*) FROM intelligence").fetchone()[0]
    print(f"\n{'='*40}")
    print(f"  Total intelligence items: {total}")
    print(f"{'='*40}")

    print("\nBy category:")
    for row in conn.execute("SELECT category, COUNT(*) as n FROM intelligence GROUP BY category ORDER BY n DESC"):
        print(f"  {row['category']:30s} {row['n']:5d}")

    print("\nBy region:")
    for row in conn.execute("SELECT region, COUNT(*) as n FROM intelligence GROUP BY region ORDER BY n DESC"):
        print(f"  {row['region']:30s} {row['n']:5d}")

    print("\nBy type:")
    for row in conn.execute("SELECT item_type, COUNT(*) as n FROM intelligence GROUP BY item_type ORDER BY n DESC"):
        print(f"  {row['item_type']:30s} {row['n']:5d}")

    print("\nRecent fetch log (last 10):")
    for row in conn.execute("SELECT source_name, fetched_at, items_new, status FROM fetch_log ORDER BY fetched_at DESC LIMIT 10"):
        print(f"  [{row['status']:5s}] {row['fetched_at'][:16]}  +{row['items_new']:3d}  {row['source_name']}")

    conn.close()


def run_demo(cfg):
    from utils.sample_data import generate_sample_data
    from database.store import insert_items, update_stats

    db_path = cfg["system"]["db_path"]
    print("\n=== Loading demo data ===")
    items = generate_sample_data(n_extra=40)
    new_count = insert_items(db_path, items)
    update_stats(db_path)
    print(f"    {new_count} demo items loaded (total: {len(items)})")


def main():
    parser = argparse.ArgumentParser(description="Food Additives Market Intelligence Pipeline")
    parser.add_argument("--collect", action="store_true", help="Collect data only")
    parser.add_argument("--build", action="store_true", help="Build dashboard only")
    parser.add_argument("--stats", action="store_true", help="Show database statistics")
    parser.add_argument("--demo", action="store_true", help="Load sample data + build dashboard (no internet needed)")
    args = parser.parse_args()

    cfg = load_config()

    # Initialize DB on first run
    from database.schema import init_db
    init_db(cfg["system"]["db_path"])

    if args.demo:
        run_demo(cfg)
        run_build(cfg)
        print(f"\n✓ Demo ready. Open: {cfg['system']['dashboard_path']}")
    elif args.stats:
        run_stats(cfg)
    elif args.collect:
        run_collect(cfg)
    elif args.build:
        run_build(cfg)
    else:
        # Full pipeline
        run_collect(cfg)
        run_build(cfg)
        print(f"\n✓ Done. Open: {cfg['system']['dashboard_path']}")


if __name__ == "__main__":
    main()
