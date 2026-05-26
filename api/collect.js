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
  // Official regulators
  { url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml', region: 'usa', source: 'FDA', country: 'US' },
  { url: 'https://www.efsa.europa.eu/en/rss/rss.xml', region: 'eu', source: 'EFSA', country: 'EU' },

  // Trade media – global
  { url: 'https://www.foodnavigator.com/rss/editorial.rss', region: 'global', source: 'FoodNavigator', country: '' },
  { url: 'https://www.foodnavigator-asia.com/rss/editorial.rss', region: 'sea', source: 'FoodNavigator Asia', country: '' },
  { url: 'https://www.foodingredientsfirst.com/rss/editorial.rss', region: 'global', source: 'Food Ingredients First', country: '' },
  { url: 'https://www.nutraingredients.com/rss/editorial.rss', region: 'global', source: 'Nutraingredients', country: '' },
  { url: 'https://www.nutraingredients-asia.com/rss/editorial.rss', region: 'sea', source: 'Nutraingredients Asia', country: '' },
  { url: 'https://www.foodbusinessnews.net/rss/news', region: 'global', source: 'Food Business News', country: '' },

  // Google News keyword RSS (no API key needed)
  { url: 'https://news.google.com/rss/search?q=food+additive+regulation+FDA+EFSA&hl=en-US&gl=US&ceid=US:en', region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=food+colorant+ban+approval+2025+2026&hl=en-US&gl=US&ceid=US:en', region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=sweetener+regulation+stevia+aspartame+sucralose&hl=en-US&gl=US&ceid=US:en', region: 'global', source: 'Google News', country: '' },
  { url: 'https://news.google.com/rss/search?q=%E9%A3%9F%E5%93%81%E6%B7%BB%E5%8A%A0%E5%89%82+%E6%B3%95%E8%A7%84+%E5%8D%AB%E5%81%A5%E5%A7%94&hl=zh-CN&gl=CN&ceid=CN:zh-Hans', region: 'china', source: 'Google News CN', country: 'CN' },
  { url: 'https://news.google.com/rss/search?q=food+additive+ASEAN+Southeast+Asia+halal&hl=en-US&gl=US&ceid=US:en', region: 'sea', source: 'Google News SEA', country: '' },
  { url: 'https://news.google.com/rss/search?q=food+additive+GCC+halal+Middle+East&hl=en-US&gl=US&ceid=US:en', region: 'mea', source: 'Google News MEA', country: '' },
];

// ─── Keyword Classification ───────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  colorants:           ['color', 'colour', 'dye', 'pigment', 'tartrazine', 'e102', 'e110', 'e120', 'e129', 'e133', 'e171', 'beta-carotene', 'curcumin', 'carmine', 'allura', 'sunset yellow', 'brilliant blue', '色素', '着色剂', '二氧化钛', '柠檬黄', '日落黄', '胭脂红'],
  sweeteners:          ['sweetener', 'aspartame', 'stevia', 'sucralose', 'saccharin', 'acesulfame', 'erythritol', 'allulose', 'xylitol', 'sorbitol', 'sugar alcohol', 'e950', 'e951', 'e954', 'e955', 'e960', 'e968', '甜味剂', '阿斯巴甜', '甜菊', '三氯蔗糖', '赤藓糖醇', '阿洛酮糖'],
  preservatives:       ['preservative', 'benzoate', 'sorbate', 'natamycin', 'nisin', 'e200', 'e211', 'e234', 'e235', 'antimicrobial', 'shelf life', '防腐剂', '苯甲酸', '山梨酸', '纳他霉素'],
  emulsifiers:         ['emulsifier', 'lecithin', 'carrageenan', 'guar gum', 'xanthan', 'pectin', 'e322', 'e407', 'e415', 'stabilizer', 'thickener', '乳化剂', '卡拉胶', '黄原胶', '果胶'],
  flavor_enhancers:    ['flavor enhancer', 'flavour enhancer', 'glutamate', 'msg', 'umami', 'e621', 'e631', 'inosinate', '增味剂', '味精', '谷氨酸钠'],
  antioxidants:        ['antioxidant', 'bha', 'bht', 'tocopherol', 'ascorbic', 'e300', 'e320', 'e306', '抗氧化剂'],
  functional_ingredients: ['probiotic', 'prebiotic', 'omega', 'collagen', 'hyaluronic', 'nmn', 'coenzyme', 'botanical', 'novel food', '功能性', '益生菌', '胶原蛋白', '透明质酸', '新食品原料'],
};

const REGION_KEYWORDS = {
  eu:    ['efsa', 'european commission', 'eu regulation', 'eur-lex', 'regulation ec', 'regulation eu', 'european food', 'europe', 'european parliament'],
  usa:   ['fda', 'usda', 'federal register', 'gras', 'cfr', 'american', 'united states', 'us food'],
  china: ['nhsa', 'nhc', 'gb 2760', 'samr', 'china food', '卫健委', '食品安全', '国标', '中国', '农业部', '市场监督'],
  sea:   ['asean', 'singapore', 'malaysia', 'indonesia', 'thailand', 'vietnam', 'philippines', 'bpom', 'sfa', 'moh malaysia', 'thai fda', '东南亚', '新加坡', '马来西亚', '印尼'],
  mea:   ['halal', 'gcc', 'saudi', 'sfda', 'uae', 'esma', 'gulf', 'middle east', '清真', '沙特', '海湾', '阿联酋'],
};

const TYPE_KEYWORDS = {
  ban:            ['ban', 'banned', 'prohibit', 'revoke', 'withdraw', '禁止', '撤销', '撤回'],
  approval:       ['approv', 'authoriz', 'permit', 'gras', 'new approval', '批准', '许可', '获批'],
  new_regulation: ['new regulation', 'new standard', 'new law', 'published standard', 'takes effect', 'new rule', '新标准', '新法规', '发布', '施行', '实施'],
  amendment:      ['amend', 'revise', 'update', 'modify', 'change limit', '修订', '修改', '更新'],
  consultation:   ['consult', 'comment', 'proposal', 'draft', 'public notice', '征求意见', '草案', '征询'],
  guidance:       ['guidance', 'guideline', 'recommendation', 'advisory', '指南', '指导', '建议'],
  safety_assessment: ['safety assessment', 'safety evaluation', 'adi', 'toxicolog', 'risk assessment', 'efsa opinion', '安全评估', '毒理', '风险评估'],
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
