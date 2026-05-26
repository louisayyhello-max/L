/**
 * RSS Collector — fetches regulatory news from official sources and trade media,
 * classifies each article, and inserts into the regulatory_updates table.
 * Deduplication is based on a hash of the article URL.
 *
 * Run manually:  node collect.js
 * Scheduled:     See collect.bat (Windows) or cron entry in README
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'foodreg.db');

// ─── RSS Sources ──────────────────────────────────────────────────────────────
const SOURCES = [
  // ── 欧美官方监管机构 ──────────────────────────────────────────
  { url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml',       region: 'usa',    source: 'FDA',              country: 'US' },
  { url: 'https://www.efsa.europa.eu/en/rss/rss.xml',                                             region: 'eu',     source: 'EFSA',             country: 'EU' },

  // ── 中国官方 & 行业媒体 ────────────────────────────────────────
  // 食品伙伴网（中国最大食品行业门户，覆盖GB标准/卫健委公告）
  { url: 'https://www.foodmate.net/rss.xml',                                                       region: 'china',  source: '食品伙伴网',        country: 'CN' },
  // 中国食品报网
  { url: 'https://www.cnfood.cn/rss.xml',                                                          region: 'china',  source: '中国食品报',        country: 'CN' },
  // 食品安全导刊
  { url: 'https://www.食品安全导刊.cn/rss.xml',                                                    region: 'china',  source: '食品安全导刊',      country: 'CN' },
  // 中国质量新闻网-食品
  { url: 'https://www.cqn.com.cn/rss/food.xml',                                                    region: 'china',  source: '中国质量新闻网',    country: 'CN' },

  // ── 中国 Google News 多关键词（覆盖官方公告/行业动态）──────────
  { url: 'https://news.google.com/rss/search?q=GB+2760+食品添加剂+标准&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',                       region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=卫健委+食品添加剂+公告+批准&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',                   region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=新食品原料+食品安全国家标准+卫健委&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',             region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=国家市场监督管理总局+食品添加剂+公告&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',           region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=食品色素+甜味剂+防腐剂+法规+2025&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',              region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=China+food+additive+regulation+GB2760+NHSA&hl=en-US&gl=US&ceid=US:en',         region: 'china', source: 'Google News CN', country: 'CN' },

  // ── 全球行业媒体 ───────────────────────────────────────────────
  { url: 'https://www.foodnavigator.com/rss/editorial.rss',          region: 'global', source: 'FoodNavigator',         country: '' },
  { url: 'https://www.foodnavigator-asia.com/rss/editorial.rss',     region: 'sea',    source: 'FoodNavigator Asia',    country: '' },
  { url: 'https://www.foodingredientsfirst.com/rss/editorial.rss',   region: 'global', source: 'Food Ingredients First',country: '' },
  { url: 'https://www.nutraingredients.com/rss/editorial.rss',       region: 'global', source: 'Nutraingredients',      country: '' },
  { url: 'https://www.nutraingredients-asia.com/rss/editorial.rss',  region: 'sea',    source: 'Nutraingredients Asia', country: '' },
  { url: 'https://www.foodbusinessnews.net/rss/news',                region: 'global', source: 'Food Business News',    country: '' },

  // ── 全球/欧美 Google News ──────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=food+additive+regulation+FDA+EFSA+ban+approval&hl=en-US&gl=US&ceid=US:en',     region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=food+colorant+dye+ban+approval+regulation&hl=en-US&gl=US&ceid=US:en',          region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=sweetener+regulation+stevia+aspartame+sucralose+2025&hl=en-US&gl=US&ceid=US:en', region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=food+preservative+emulsifier+standard+regulation&hl=en-US&gl=US&ceid=US:en',   region: 'global', source: 'Google News', country: '' },

  // ── 东南亚 ─────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=food+additive+ASEAN+BPOM+Singapore+Malaysia+Thailand&hl=en-US&gl=US&ceid=US:en', region: 'sea', source: 'Google News SEA', country: '' },
  { url: 'https://news.google.com/rss/search?q=halal+food+additive+ingredient+ASEAN&hl=en-US&gl=US&ceid=US:en',                  region: 'sea', source: 'Google News SEA', country: '' },

  // ── 中东 ───────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=food+additive+GCC+halal+SFDA+UAE+Saudi&hl=en-US&gl=US&ceid=US:en',                region: 'mea', source: 'Google News MEA', country: '' },
  { url: 'https://news.google.com/rss/search?q=食品添加剂+清真+海湾+沙特+阿联酋&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',                 region: 'mea', source: 'Google News MEA', country: '' },
];

// ─── Keyword Classification ───────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  colorants: [
    'color', 'colour', 'dye', 'pigment', 'tartrazine', 'e102', 'e110', 'e120', 'e129', 'e133', 'e171',
    'beta-carotene', 'curcumin', 'carmine', 'allura', 'sunset yellow', 'brilliant blue', 'erythrosine',
    'red 40', 'yellow 5', 'yellow 6', 'spirulina', 'anthocyanin', 'butterfly pea', 'gardenia',
    '色素', '着色剂', '染料', '二氧化钛', '柠檬黄', '日落黄', '胭脂红', '诱惑红', '亮蓝',
    '姜黄素', 'β-胡萝卜素', '花青素', '叶绿素', '栀子蓝', '辣椒红', '红曲红',
  ],
  sweeteners: [
    'sweetener', 'aspartame', 'stevia', 'steviol', 'sucralose', 'saccharin', 'acesulfame',
    'erythritol', 'allulose', 'xylitol', 'sorbitol', 'maltitol', 'monk fruit', 'luo han guo',
    'sugar alcohol', 'intense sweetener', 'low calorie', 'zero sugar',
    'e950', 'e951', 'e954', 'e955', 'e960', 'e968',
    '甜味剂', '阿斯巴甜', '甜菊糖', '甜菊苷', '三氯蔗糖', '安赛蜜', '糖精',
    '赤藓糖醇', '阿洛酮糖', '木糖醇', '麦芽糖醇', '罗汉果', '甜蜜素',
  ],
  preservatives: [
    'preservative', 'benzoate', 'sorbate', 'natamycin', 'nisin', 'propionic', 'sulfite',
    'antimicrobial', 'shelf life', 'mold inhibit', 'antifungal',
    'e200', 'e202', 'e210', 'e211', 'e220', 'e234', 'e235',
    '防腐剂', '苯甲酸', '苯甲酸钠', '山梨酸', '山梨酸钾', '纳他霉素', '乳酸链球菌素',
    '丙酸', '亚硫酸盐', '抑菌',
  ],
  emulsifiers: [
    'emulsifier', 'lecithin', 'carrageenan', 'guar gum', 'xanthan', 'pectin', 'gellan',
    'agar', 'starch', 'modified starch', 'cellulose', 'stabilizer', 'thickener', 'gelling agent',
    'e322', 'e407', 'e410', 'e412', 'e415', 'e440', 'e460',
    '乳化剂', '卡拉胶', '黄原胶', '瓜尔胶', '果胶', '卵磷脂', '琼脂',
    '增稠剂', '稳定剂', '变性淀粉', '甲基纤维素',
  ],
  flavor_enhancers: [
    'flavor enhancer', 'flavour enhancer', 'glutamate', 'msg', 'umami', 'inosinate', 'guanylate',
    'e621', 'e627', 'e631', 'e635', 'yeast extract',
    '增味剂', '味精', '谷氨酸钠', '鸡精', '肌苷酸', '鸟苷酸', '酵母提取物',
  ],
  antioxidants: [
    'antioxidant', 'bha', 'bht', 'tbhq', 'tocopherol', 'ascorbic acid', 'vitamin c', 'vitamin e',
    'rosemary extract', 'e300', 'e306', 'e307', 'e320', 'e321', 'e319',
    '抗氧化剂', 'BHA', 'BHT', '维生素C', '维生素E', '生育酚', '迷迭香提取物', '没食子酸丙酯',
  ],
  functional_ingredients: [
    'probiotic', 'prebiotic', 'postbiotic', 'omega', 'dha', 'epa', 'collagen', 'hyaluronic',
    'nmn', 'nad', 'coenzyme q10', 'botanical', 'herbal extract', 'novel food', 'new food ingredient',
    'phospholipid', 'plant sterol', 'inulin', 'fos', 'gos',
    '功能性', '益生菌', '益生元', '胶原蛋白', '透明质酸', '玻尿酸',
    '新食品原料', '植物提取物', '植物甾醇', '菊粉', '低聚果糖', '磷脂',
  ],
};

const REGION_KEYWORDS = {
  eu: [
    'efsa', 'european commission', 'eu regulation', 'eur-lex', 'regulation ec', 'regulation eu',
    'european food safety', 'european parliament', 'annex ii', 'e number', 'food additives regulation',
  ],
  usa: [
    'fda', 'usda', 'federal register', 'gras', '21 cfr', 'color additive', 'food safety modernization',
    'united states', 'american', 'us food and drug',
  ],
  china: [
    'nhsa', 'nhc', 'gb 2760', 'gb2760', 'samr', 'cfsa', 'china food', 'chinese food',
    '卫健委', '国家卫生健康委', '食品安全', '国家标准', '中国', '市场监督', '食药监',
    '新食品原料', '食品添加剂公告', '农业农村部', '海关总署', '食品伙伴', '食品法规',
    '国家食品安全', '风险评估中心',
  ],
  sea: [
    'asean', 'singapore', 'malaysia', 'indonesia', 'thailand', 'vietnam', 'philippines',
    'bpom', 'sfa', 'moh malaysia', 'thai fda', 'mfds', 'accsq',
    '东南亚', '新加坡', '马来西亚', '印尼', '印度尼西亚', '泰国', '越南', '菲律宾',
  ],
  mea: [
    'halal', 'gcc', 'saudi', 'sfda', 'uae', 'esma', 'gulf', 'middle east',
    'egypt', 'turkey', 'iran', 'pakistan', 'nigeria', 'south africa',
    '清真', '沙特', '海湾', '阿联酋', '中东', '非洲',
  ],
};

const TYPE_KEYWORDS = {
  ban:               ['ban', 'banned', 'prohibit', 'revoke authoriz', 'withdraw', 'phase out', 'no longer permitted', '禁止', '撤销', '撤回', '淘汰', '停止使用'],
  approval:          ['approv', 'authoriz', 'permit', 'gras', 'new approval', 'cleared', 'listed', '批准', '许可', '获批', '列入', '准用'],
  new_regulation:    ['new regulation', 'new standard', 'new law', 'takes effect', 'enters into force', 'new rule', 'published standard', '新标准', '新法规', '发布', '施行', '实施', '正式实施'],
  amendment:         ['amend', 'revise', 'update', 'modify', 'change limit', 'revised level', '修订', '修改', '更新', '调整限量', '修正'],
  consultation:      ['consult', 'comment', 'proposal', 'draft', 'public notice', 'call for data', '征求意见', '草案', '公开征询', '征集数据'],
  guidance:          ['guidance', 'guideline', 'recommendation', 'advisory', 'FAQ', '指南', '指导', '建议', '问答'],
  safety_assessment: ['safety assessment', 'safety evaluation', 'adi', 'tolerable', 'toxicolog', 'risk assessment', 'efsa opinion', 're-evaluation', '安全评估', '毒理', '风险评估', '重新评价'],
};

function score(text, keywords) {
  const t = text.toLowerCase();
  return keywords.reduce((n, kw) => n + (t.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function classify(title, summary) {
  const text = `${title} ${summary}`;

  // category
  let bestCat = 'general', bestScore = 0;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const s = score(text, kws);
    if (s > bestScore) { bestScore = s; bestCat = cat; }
  }

  // region
  let bestRegion = 'global', bestRScore = 0;
  for (const [r, kws] of Object.entries(REGION_KEYWORDS)) {
    const s = score(text, kws);
    if (s > bestRScore) { bestRScore = s; bestRegion = r; }
  }

  // update type
  let bestType = 'news', bestTScore = 0;
  for (const [t, kws] of Object.entries(TYPE_KEYWORDS)) {
    const s = score(text, kws);
    if (s > bestTScore) { bestTScore = s; bestType = t; }
  }

  // relevance: ratio of matched additive keywords
  const totalKws = Object.values(CATEGORY_KEYWORDS).flat();
  const matched = score(text, totalKws);
  const relevance = Math.min(1, matched / 3);

  return { category: bestCat, region: bestRegion, update_type: bestType, relevance };
}

// ─── RSS XML Parser (no external deps) ───────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractAtomLink(itemXml) {
  const m = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function parseItems(xml) {
  const items = [];
  // RSS 2.0 items
  const rssRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = rssRe.exec(xml)) !== null) {
    const raw = m[1];
    const title = extractTag(raw, 'title');
    const link  = extractTag(raw, 'link') || extractAtomLink(raw);
    const desc  = extractTag(raw, 'description') || extractTag(raw, 'content:encoded') || extractTag(raw, 'summary');
    const pub   = extractTag(raw, 'pubDate') || extractTag(raw, 'published') || extractTag(raw, 'dc:date');
    if (title && link) items.push({ title, link, desc, pub });
  }
  // Atom entries (if no RSS items found)
  if (items.length === 0) {
    const atomRe = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((m = atomRe.exec(xml)) !== null) {
      const raw = m[1];
      const title = extractTag(raw, 'title');
      const link  = extractAtomLink(raw) || extractTag(raw, 'id');
      const desc  = extractTag(raw, 'summary') || extractTag(raw, 'content');
      const pub   = extractTag(raw, 'published') || extractTag(raw, 'updated');
      if (title && link) items.push({ title, link, desc, pub });
    }
  }
  return items;
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────
async function fetchWithTimeout(url, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'FoodRegTracker/1.0 (regulatory research; contact@example.com)' },
    });
    const text = await res.text();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function collect() {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');

  // Ensure table exists (in case collect runs before server first-boot)
  db.exec(`
    CREATE TABLE IF NOT EXISTS regulatory_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE,
      title TEXT NOT NULL, title_zh TEXT, summary TEXT, url TEXT,
      source TEXT, region TEXT, country_code TEXT,
      category TEXT, substance_refs TEXT, update_type TEXT,
      effective_date TEXT, published_at DATETIME, language TEXT DEFAULT 'en',
      relevance REAL DEFAULT 0.5, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Migrate: add uid column if missing (existing DBs without it)
  const cols = db.prepare(`PRAGMA table_info(regulatory_updates)`).all().map(c => c.name);
  if (!cols.includes('uid')) {
    db.exec(`ALTER TABLE regulatory_updates ADD COLUMN uid TEXT`);
    console.log('  Migrated: added uid column to existing DB');
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO regulatory_updates
      (uid, title, summary, url, source, region, country_code, category, substance_refs, update_type, published_at, language, relevance)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  let totalNew = 0, totalSeen = 0;

  for (const src of SOURCES) {
    process.stdout.write(`  Fetching ${src.source}… `);
    try {
      const xml = await fetchWithTimeout(src.url);
      const items = parseItems(xml);
      let newCount = 0;

      for (const item of items) {
        const uid = createHash('md5').update(item.link).digest('hex');
        const { category, region: detectedRegion, update_type, relevance } = classify(item.title, item.desc);
        const region = detectedRegion !== 'global' ? detectedRegion : src.region;
        const summary = item.desc.slice(0, 1000);
        let pubDate = null;
        try { pubDate = item.pub ? new Date(item.pub).toISOString() : null; } catch {}

        const lang = /[一-鿿]/.test(item.title) ? 'zh' : 'en';

        const result = insert.run(uid, item.title, summary, item.link, src.source, region, src.country || '', category, '[]', update_type, pubDate, lang, relevance);
        if (result.changes > 0) newCount++;
      }

      totalNew += newCount;
      totalSeen += items.length;
      console.log(`${items.length} items, ${newCount} new`);

      // Polite delay
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Keep only last 90 days to prevent DB bloat
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const deleted = db.prepare(`DELETE FROM regulatory_updates WHERE published_at < ? AND created_at < ?`).run(cutoff, cutoff);

  console.log(`\nDone. ${totalNew} new articles added (${totalSeen} seen). ${deleted.changes} old records purged.`);
  db.close();
}

collect().catch(e => { console.error(e); process.exit(1); });
