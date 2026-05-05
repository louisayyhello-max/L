"""
Generate realistic sample data for dashboard demonstration.
Run: python pipeline.py --demo
"""
import hashlib
import random
from datetime import datetime, timedelta, timezone

SAMPLE_ITEMS = [
    # ── 甜味剂 ──────────────────────────────────────────────────────
    {
        "title": "FDA Grants GRAS Status to New High-Purity Allulose Process",
        "summary": "The U.S. Food and Drug Administration has affirmed Generally Recognized as Safe (GRAS) status for a novel enzymatic production process for allulose, potentially lowering costs for the rare sugar alternative.",
        "url": "https://example.com/fda-allulose-gras",
        "source": "Food Business News",
        "region": "usa",
        "category": "sweeteners",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "EFSA Publishes Safety Assessment on Steviol Glycosides — New Forms Approved",
        "summary": "EFSA's Panel on Food Additives released a positive safety opinion on several new steviol glycoside forms including Reb M and Reb D, paving the way for wider use across the EU as a natural sweetener.",
        "url": "https://example.com/efsa-stevia-rebm",
        "source": "EFSA",
        "region": "eu",
        "category": "sweeteners",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "China Amends GB 2760: New Limits on Acesulfame-K and Aspartame in Beverages",
        "summary": "国家卫生健康委员会发布公告，修订GB 2760食品添加剂使用标准，调整安赛蜜和阿斯巴甜在饮料中的最大使用量，同时新增赤藓糖醇在多类食品中的使用规定。",
        "url": "https://example.com/gb2760-sweetener-amendment",
        "source": "国家卫生健康委员会",
        "region": "china",
        "category": "sweeteners",
        "item_type": "regulatory",
        "language": "zh",
    },
    {
        "title": "Erythritol Global Market Expected to Reach $1.2B by 2028",
        "summary": "The global erythritol market is projected to grow at a CAGR of 7.8% from 2023 to 2028, driven by strong demand from beverage and confectionery sectors seeking natural zero-calorie sweetening solutions.",
        "url": "https://example.com/erythritol-market-2028",
        "source": "Grand View Research",
        "region": "global",
        "category": "sweeteners",
        "item_type": "market",
        "language": "en",
    },
    {
        "title": "Tate & Lyle Expands Allulose Production Capacity in Singapore",
        "summary": "Tate & Lyle announced a $120 million investment to expand its rare sugar production capacity in Singapore, targeting the Asia-Pacific market where demand for low-calorie sweeteners is growing rapidly.",
        "url": "https://example.com/tate-lyle-singapore-allulose",
        "source": "Food Ingredients First",
        "region": "sea",
        "category": "sweeteners",
        "item_type": "competitor",
        "language": "en",
    },
    {
        "title": "Saudi Arabia SFDA Updates Permitted Sweetener List — Allulose Now Approved",
        "summary": "The Saudi Food and Drug Authority has expanded its list of approved sweeteners to include allulose and certain novel steviol glycosides, effective from Q3 2025, aligning with international Codex standards.",
        "url": "https://example.com/sfda-sweetener-approval",
        "source": "SFDA",
        "region": "mea",
        "category": "sweeteners",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "赤藓糖醇价格跌至三年新低，行业产能过剩加剧",
        "summary": "受国内多家企业大规模扩产影响，赤藓糖醇现货价格跌破18000元/吨，较高峰期下降超过60%。分析人士预计产能出清需要12-18个月。",
        "url": "https://example.com/erythritol-price-drop",
        "source": "中国食品报",
        "region": "china",
        "category": "sweeteners",
        "item_type": "market",
        "language": "zh",
    },
    {
        "title": "Thailand FDA Approves Stevia as Food Additive — New Opportunities for Exporters",
        "summary": "Thailand's Food and Drug Administration officially listed stevia leaf extract as a permitted food additive in sweetened beverages and dairy products, following months of review under the ASEAN harmonization framework.",
        "url": "https://example.com/thailand-fda-stevia",
        "source": "FoodNavigator Asia",
        "region": "sea",
        "category": "sweeteners",
        "item_type": "regulatory",
        "language": "en",
    },

    # ── 食用色素 ──────────────────────────────────────────────────────
    {
        "title": "EU to Phase Out Titanium Dioxide (E171) in Food by 2025",
        "summary": "Following EFSA's ruling that titanium dioxide can no longer be considered safe as a food additive, the European Commission has confirmed a phase-out timeline. Food manufacturers must find alternatives for white coloring in confectionery and sauces.",
        "url": "https://example.com/eu-e171-ban",
        "source": "EFSA",
        "region": "eu",
        "category": "colorants",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "Natural Colorant Market Surges as Clean Label Demand Grows",
        "summary": "The global natural food colorants market reached $2.4 billion in 2024, growing at 8.2% annually. Beta-carotene, anthocyanins, and curcumin are the fastest-growing segments driven by clean label trends in North America and Europe.",
        "url": "https://example.com/natural-colorant-market-2024",
        "source": "Mordor Intelligence",
        "region": "global",
        "category": "colorants",
        "item_type": "market",
        "language": "en",
    },
    {
        "title": "FDA Approves Butterfly Pea Flower Extract as Provisional Color Additive",
        "summary": "The U.S. FDA has approved butterfly pea flower (Clitoria ternatea) extract as a provisional color additive for use in alcoholic beverages, sports drinks, and ready-to-drink teas, citing a long history of safe use globally.",
        "url": "https://example.com/fda-butterfly-pea-approval",
        "source": "FDA",
        "region": "usa",
        "category": "colorants",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "中国天然色素行业协会：花青素提取物需求年增25%",
        "summary": "随着消费者对天然配料的偏好提升，国内花青素市场需求显著增长，主要应用于饮料、乳制品及功能性食品。原料主要来源为蓝莓、紫薯和黑豆提取物。",
        "url": "https://example.com/china-anthocyanin-demand",
        "source": "中国食品添加剂协会",
        "region": "china",
        "category": "colorants",
        "item_type": "market",
        "language": "zh",
    },
    {
        "title": "GNT Group Acquires Specialty Spirulina Producer to Secure Blue Colorant Supply",
        "summary": "Natural colorant specialist GNT Group completed the acquisition of a spirulina cultivation company to secure supply of phycocyanin, the key blue pigment, as demand for blue natural colors outpaces supply globally.",
        "url": "https://example.com/gnt-spirulina-acquisition",
        "source": "Food Ingredients First",
        "region": "global",
        "category": "colorants",
        "item_type": "competitor",
        "language": "en",
    },
    {
        "title": "UAE ESMA Issues New Standards for Synthetic Food Dyes — Reduced Limits",
        "summary": "The Emirates Authority for Standardization and Metrology (ESMA) published updated technical regulations reducing maximum permitted levels for sunset yellow, tartrazine, and brilliant blue in food products sold in UAE markets.",
        "url": "https://example.com/uae-esma-dye-limits",
        "source": "ESMA",
        "region": "mea",
        "category": "colorants",
        "item_type": "regulatory",
        "language": "en",
    },

    # ── 食品香料 ──────────────────────────────────────────────────────
    {
        "title": "FEMA Publishes 31st GRAS List — 56 New Flavor Ingredients Added",
        "summary": "The Flavor and Extract Manufacturers Association released its 31st list of flavor ingredients that are Generally Recognized As Safe (GRAS), adding 56 new substances following independent expert review.",
        "url": "https://example.com/fema-gras-31st",
        "source": "FEMA",
        "region": "usa",
        "category": "flavors",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "Global Flavor & Fragrance Market Projected to Hit $40B by 2030",
        "summary": "The global flavor and fragrance market is forecast to exceed $40 billion by 2030, according to a new report. Asia-Pacific is the fastest-growing region, with savory and umami flavors seeing the highest growth rates.",
        "url": "https://example.com/ff-market-2030",
        "source": "MarketsandMarkets",
        "region": "global",
        "category": "flavors",
        "item_type": "market",
        "language": "en",
    },
    {
        "title": "IFF and Givaudan Battle for Market Share in Chinese Flavor Market",
        "summary": "International Flavors & Fragrances (IFF) and Givaudan are both expanding their local R&D and application centers in Shanghai and Guangzhou as China's processed food market drives demand for customized flavor solutions.",
        "url": "https://example.com/iff-givaudan-china",
        "source": "FoodNavigator Asia",
        "region": "china",
        "category": "flavors",
        "item_type": "competitor",
        "language": "en",
    },
    {
        "title": "欧盟修订食品香料法规 — 新增17种允许使用的天然香料物质",
        "summary": "欧盟委员会发布实施条例，对食品香料正面清单进行修订，新增17种来源于天然提取物的香料物质，同时对5种合成香料的使用量设置了更严格的限制。",
        "url": "https://example.com/eu-flavor-regulation-update",
        "source": "European Commission",
        "region": "eu",
        "category": "flavors",
        "item_type": "regulatory",
        "language": "zh",
    },
    {
        "title": "Vanilla Supply Chain Disruption Pushes Prices Up 40% in Southeast Asia",
        "summary": "Cyclone damage to Madagascar's vanilla crop and transportation bottlenecks have caused natural vanilla prices to spike across Southeast Asian markets, prompting many manufacturers to accelerate reformulation with synthetic or biosynthetic alternatives.",
        "url": "https://example.com/vanilla-supply-crisis-sea",
        "source": "Food Business News",
        "region": "sea",
        "category": "flavors",
        "item_type": "market",
        "language": "en",
    },
    {
        "title": "Halal Flavor Certification Requirements Tighten in Gulf Cooperation Council Markets",
        "summary": "GCC countries have unified Halal certification standards for flavor ingredients, requiring full traceability documentation for all animal-derived flavor carriers and solvents. Non-compliant products face import bans effective mid-2025.",
        "url": "https://example.com/gcc-halal-flavor",
        "source": "GSO",
        "region": "mea",
        "category": "flavors",
        "item_type": "regulatory",
        "language": "en",
    },

    # ── 功能新食品原料 ────────────────────────────────────────────────
    {
        "title": "China NHSA Approves Hyaluronic Acid (Sodium Hyaluronate) as Novel Food Ingredient",
        "summary": "国家卫生健康委员会正式批准透明质酸钠（玻尿酸）作为新食品原料，可用于普通食品中，适用人群为18岁以上成年人，推荐每日摄入量不超过200mg。",
        "url": "https://example.com/nhsa-hyaluronic-acid-approval",
        "source": "国家卫生健康委员会",
        "region": "china",
        "category": "functional_ingredients",
        "item_type": "regulatory",
        "language": "zh",
    },
    {
        "title": "EU Novel Food Regulation Update: Lab-Grown Collagen and Fermented Protein Ingredients",
        "summary": "The European Commission has received novel food applications for lab-grown collagen peptides and precision-fermented whey protein alternatives, with assessments expected to complete within 18 months per EFSA review guidelines.",
        "url": "https://example.com/eu-novel-food-collagen",
        "source": "European Commission",
        "region": "eu",
        "category": "functional_ingredients",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "Functional Ingredients Market in ASEAN to Grow 12% CAGR Through 2028",
        "summary": "Southeast Asia's functional food ingredients market is expanding rapidly, with probiotic strains, plant proteins, and adaptogenic botanicals leading growth. Indonesia and Vietnam are identified as the fastest-growing markets.",
        "url": "https://example.com/asean-functional-ingredients",
        "source": "Nutraingredients Asia",
        "region": "sea",
        "category": "functional_ingredients",
        "item_type": "market",
        "language": "en",
    },
    {
        "title": "FDA Sends Warning Letters Over NMN Marketing Claims",
        "summary": "The FDA issued warning letters to multiple dietary supplement companies marketing NMN (nicotinamide mononucleotide) products for age-reversal or disease prevention claims, reiterating that structure/function claims must be substantiated.",
        "url": "https://example.com/fda-nmn-warning",
        "source": "FDA",
        "region": "usa",
        "category": "functional_ingredients",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "中国植物提取物出口额创历史新高，姜黄素、葡萄籽提取物需求旺盛",
        "summary": "2024年中国植物提取物出口总额达58亿美元，同比增长18%。其中姜黄素、葡萄籽提取物、枸杞多糖对欧美市场出口增速最快，主要下游应用为膳食补充剂和功能性食品。",
        "url": "https://example.com/china-botanical-export-2024",
        "source": "中国医保商会",
        "region": "china",
        "category": "functional_ingredients",
        "item_type": "market",
        "language": "zh",
    },
    {
        "title": "Nigeria NAFDAC Issues Guidelines for Functional Food Ingredients Registration",
        "summary": "Nigeria's National Agency for Food and Drug Administration and Control published new registration guidelines for functional food ingredients, requiring clinical evidence for health claims and GMP certificates from manufacturing facilities.",
        "url": "https://example.com/nafdac-functional-food-guidelines",
        "source": "NAFDAC",
        "region": "mea",
        "category": "functional_ingredients",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "Lonza Acquires Probiotic Strain Library from Swiss Research Institute",
        "summary": "Swiss life science company Lonza acquired an extensive probiotic strain library from ETH Zurich, expanding its portfolio of documented health-benefit strains for use in functional food and dietary supplement applications globally.",
        "url": "https://example.com/lonza-probiotic-acquisition",
        "source": "Nutraingredients",
        "region": "global",
        "category": "functional_ingredients",
        "item_type": "competitor",
        "language": "en",
    },

    # ── 综合 ─────────────────────────────────────────────────────────
    {
        "title": "Codex Alimentarius Commission Adopts New Principles on Food Additives Safety",
        "summary": "The 46th session of the Codex Alimentarius Commission adopted updated principles for the assessment and management of food additive safety, incorporating new guidance on cumulative exposure and vulnerable populations.",
        "url": "https://example.com/codex-food-additives-principles",
        "source": "FAO/WHO Codex",
        "region": "global",
        "category": "general",
        "item_type": "regulatory",
        "language": "en",
    },
    {
        "title": "IFT 2025 Conference: Key Themes Around Precision Fermentation and AI-Driven Formulation",
        "summary": "The Institute of Food Technologists' annual conference highlighted precision fermentation, AI-assisted formulation, and sustainable sourcing as dominant trends reshaping the food ingredients industry in 2025.",
        "url": "https://example.com/ift-2025-conference",
        "source": "IFT",
        "region": "usa",
        "category": "general",
        "item_type": "news",
        "language": "en",
    },
    {
        "title": "食品添加剂行业2025年展望：天然化、功能化、国际标准协调",
        "summary": "行业分析显示，2025年中国食品添加剂市场将延续三大趋势：天然来源原料加速替代合成产品、功能性配料价值重估、以及与国际标准（CODEX、EFSA）的协调进程加快。",
        "url": "https://example.com/china-food-additives-outlook-2025",
        "source": "食品工业协会",
        "region": "china",
        "category": "general",
        "item_type": "news",
        "language": "zh",
    },
]


def generate_sample_data(n_extra: int = 30) -> list[dict]:
    """Return base samples + randomized variations to populate the dashboard."""
    import copy

    result = []
    now = datetime.now(timezone.utc)

    for i, item in enumerate(SAMPLE_ITEMS):
        days_ago = random.randint(0, 45)
        published = (now - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
        uid = hashlib.md5(f"{item['url']}{item['title']}".encode()).hexdigest()
        result.append({**copy.deepcopy(item), "uid": uid, "published_at": published,
                        "relevance": round(random.uniform(0.4, 0.95), 3),
                        "raw_content": item.get("summary", ""), "tags": []})

    # Add randomized extras to simulate ongoing collection
    categories = ["sweeteners", "colorants", "flavors", "functional_ingredients", "general"]
    regions = ["china", "eu", "usa", "sea", "mea", "global"]
    types = ["news", "regulatory", "market", "competitor"]
    sources = ["FoodNavigator", "Nutraingredients", "Food Dive", "Bloomberg Food",
               "Reuters Commodities", "食品工业", "中国食品报", "EFSA", "FDA", "中国卫健委"]

    extra_titles = {
        "sweeteners": [
            "Sucralose Demand Rises in Middle East Beverage Market",
            "New Enzymatic Route for Trehalose Production Cuts Costs by 30%",
            "甜菊糖苷在乳饮料中应用技术研究进展",
            "Monk Fruit Extract Supply Tightens as China Harvest Falls Short",
            "Xylitol Price Volatility Continues Amid Supply Chain Realignment",
        ],
        "colorants": [
            "Annatto Color Use Expanding in Dairy as Carmine Faces Scrutiny",
            "Black Carrot Extract Gains EU Approval for Use in Soft Drinks",
            "国内番茄红素提取工艺技术突破，产业化进程加快",
            "Paprika Oleoresin Demand Surges in Processed Meat Applications",
            "Turmeric Curcumin Supply Disruption Following Indian Export Restrictions",
        ],
        "flavors": [
            "Plant-Based Meat Category Driving Innovation in Savory Flavor Systems",
            "Clean Label Flavor Encapsulation Technology Advances",
            "中国香料出口竞争力分析：桂皮、八角市场格局",
            "Dairy Flavor Demand in Indonesia Grows with Rising Middle Class",
            "Smoke Flavor Alternatives Gain Ground as Traditional Methods Face Restrictions",
        ],
        "functional_ingredients": [
            "Postbiotic Category Regulation Clarified in Multiple Markets",
            "Collagen Peptide Applications in Food Expanding Beyond Supplements",
            "益生元低聚果糖市场规模突破百亿，头部企业加速布局",
            "Lion's Mane Mushroom Extract Faces Novel Food Review in EU",
            "Plant Protein Concentrate Demand Outpaces Supply in Southeast Asia",
        ],
        "general": [
            "Food Industry Sustainability Commitments Drive Ingredient Reformulation",
            "Trade Tensions Impact Food Additive Import Tariffs",
            "全球食品安全法规趋同进程：机遇与挑战",
            "Digital Labeling Requirements for Food Additives Expanding in Asia",
            "Inflation Impact on Premium Natural Ingredient Adoption Rates",
        ],
    }

    for i in range(n_extra):
        cat = random.choice(categories)
        region = random.choice(regions)
        item_type = random.choice(types)
        days_ago = random.randint(1, 90)
        published = (now - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
        title = random.choice(extra_titles.get(cat, extra_titles["general"]))
        uid = hashlib.md5(f"extra_{i}_{title}".encode()).hexdigest()

        result.append({
            "uid": uid,
            "title": title,
            "summary": f"Market intelligence update: {title.lower()}. Industry analysts and regulatory observers continue to monitor developments in this space as global demand patterns shift.",
            "url": f"https://example.com/article-{i}",
            "source": random.choice(sources),
            "region": region,
            "category": cat,
            "item_type": item_type,
            "language": "zh" if region == "china" and random.random() > 0.5 else "en",
            "published_at": published,
            "relevance": round(random.uniform(0.2, 0.85), 3),
            "raw_content": "",
            "tags": [],
        })

    return result
