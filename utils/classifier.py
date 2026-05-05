"""
Keyword-based classifier: assigns category, region, item_type, and relevance score
to each intelligence item using config.yaml definitions.
"""
import re
import yaml
from pathlib import Path


_config = None


def _load_config():
    global _config
    if _config is None:
        cfg_path = Path(__file__).parent.parent / "config.yaml"
        with open(cfg_path, encoding="utf-8") as f:
            _config = yaml.safe_load(f)
    return _config


def _text(item: dict) -> str:
    return f"{item.get('title', '')} {item.get('summary', '')} {item.get('raw_content', '')}".lower()


def classify_category(item: dict) -> tuple[str, float]:
    cfg = _load_config()
    text = _text(item)
    scores: dict[str, int] = {}
    for cat_name, cat_cfg in cfg["categories"].items():
        count = 0
        for kw in cat_cfg.get("en", []) + cat_cfg.get("zh", []):
            count += len(re.findall(re.escape(kw.lower()), text))
        if count:
            scores[cat_name] = count
    if not scores:
        return "general", 0.0
    best = max(scores, key=scores.__getitem__)
    total = sum(scores.values())
    return best, round(min(scores[best] / max(total, 1), 1.0), 3)


def classify_region(item: dict) -> str:
    cfg = _load_config()
    text = _text(item)
    region_hits: dict[str, int] = {}

    region_keywords = {
        "china": ["china", "chinese", "中国", "china nhsa", "gb 2760", "卫健委", "samr", "nhsa",
                  "csfda", "海关总署", "国家卫生"],
        "eu": ["europe", "european", "efsa", "eu ", "eur ", "brussels", "regulation ec", "e-number",
               "dg sante", "欧盟", "欧洲"],
        "usa": ["fda", "usda", "usa", "united states", "american", "cfr ", "gras", "美国", "us "],
        "sea": ["vietnam", "thailand", "indonesia", "malaysia", "philippines", "singapore",
                "asean", "东南亚", "越南", "泰国", "印尼", "马来西亚"],
        "mea": ["uae", "saudi", "egypt", "africa", "middle east", "halal", "gcc", "nigeria",
                "kenya", "south africa", "中东", "非洲", "海湾"],
    }

    for region, keywords in region_keywords.items():
        count = sum(1 for kw in keywords if kw in text)
        if count:
            region_hits[region] = count

    if not region_hits:
        return "global"
    return max(region_hits, key=region_hits.__getitem__)


def classify_type(item: dict) -> str:
    text = _text(item)
    regulatory_signals = [
        "regulation", "regulatory", "fda", "efsa", "approval", "ban", "permitted",
        "standard", "法规", "公告", "批准", "禁止", "标准", "gb ", "cfr", "directive",
        "amendment", "guidance", "rule", "compliance"
    ]
    market_signals = [
        "market size", "market growth", "revenue", "cagr", "forecast", "demand",
        "supply chain", "price", "shortage", "capacity", "production", "export",
        "import", "trade", "市场规模", "市场份额", "产能", "价格", "出口", "进口"
    ]
    competitor_signals = [
        "acquisition", "merger", "partnership", "launch", "expand", "invest",
        "facility", "plant", "ipo", "收购", "并购", "合作", "投资", "扩产", "上市"
    ]

    reg_score = sum(1 for s in regulatory_signals if s in text)
    mkt_score = sum(1 for s in market_signals if s in text)
    comp_score = sum(1 for s in competitor_signals if s in text)

    if reg_score >= 2:
        return "regulatory"
    if mkt_score >= 2:
        return "market"
    if comp_score >= 2:
        return "competitor"
    return "news"


def classify_relevance(item: dict) -> float:
    cfg = _load_config()
    text = _text(item)
    all_keywords = []
    for cat_cfg in cfg["categories"].values():
        all_keywords.extend(cat_cfg.get("en", []))
        all_keywords.extend(cat_cfg.get("zh", []))

    hits = sum(1 for kw in all_keywords if kw.lower() in text)
    return round(min(hits / 5.0, 1.0), 3)


def classify(item: dict) -> dict:
    category, cat_score = classify_category(item)
    relevance = classify_relevance(item)
    return {
        **item,
        "category": category,
        "region": classify_region(item),
        "item_type": classify_type(item),
        "relevance": max(relevance, cat_score),
    }
