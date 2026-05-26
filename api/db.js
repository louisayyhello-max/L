import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'foodreg.db');

export function initDB() {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS substances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_zh TEXT,
      e_number TEXT,
      ins_number TEXT,
      cas_number TEXT,
      category TEXT,
      subcategory TEXT,
      description_en TEXT,
      adi TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS country_regulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      substance_id INTEGER REFERENCES substances(id),
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      status TEXT NOT NULL,
      max_level TEXT,
      permitted_uses TEXT,
      regulation_ref TEXT,
      effective_date TEXT,
      notes TEXT,
      source_url TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS regulatory_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_zh TEXT,
      summary TEXT,
      url TEXT,
      source TEXT,
      region TEXT,
      country_code TEXT,
      category TEXT,
      substance_refs TEXT,
      update_type TEXT,
      effective_date TEXT,
      published_at DATETIME,
      language TEXT DEFAULT 'en',
      relevance REAL DEFAULT 0.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_updates_region ON regulatory_updates(region);
    CREATE INDEX IF NOT EXISTS idx_updates_category ON regulatory_updates(category);
    CREATE INDEX IF NOT EXISTS idx_updates_type ON regulatory_updates(update_type);
    CREATE INDEX IF NOT EXISTS idx_updates_published ON regulatory_updates(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_regs_substance ON country_regulations(substance_id);
    CREATE INDEX IF NOT EXISTS idx_regs_country ON country_regulations(country_code);
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM substances').get().c;
  if (count === 0) {
    seedData(db);
  }

  return db;
}

function seedData(db) {
  const insertSubstance = db.prepare(`
    INSERT INTO substances (name_en, name_zh, e_number, ins_number, cas_number, category, subcategory, description_en, adi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReg = db.prepare(`
    INSERT INTO country_regulations (substance_id, country_code, country_name, status, max_level, permitted_uses, regulation_ref, effective_date, notes, source_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUpdate = db.prepare(`
    INSERT INTO regulatory_updates (title, title_zh, summary, url, source, region, country_code, category, substance_refs, update_type, effective_date, published_at, language, relevance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const substances = [
    // Colorants
    ['Titanium Dioxide', '二氧化钛', 'E171', 'INS 171', '13463-67-7', 'colorants', 'inorganic', 'White colorant used in confectionery, sauces, and coatings.', 'Not established (nano concerns)'],
    ['Tartrazine', '柠檬黄', 'E102', 'INS 102', '1934-21-0', 'colorants', 'synthetic', 'Yellow azo dye used in beverages, confectionery and snacks.', '7.5 mg/kg bw/day'],
    ['Sunset Yellow FCF', '日落黄', 'E110', 'INS 110', '2783-94-0', 'colorants', 'synthetic', 'Orange-yellow azo dye used in beverages and preserves.', '4 mg/kg bw/day'],
    ['Allura Red AC', '诱惑红', 'E129', 'INS 129', '25956-17-6', 'colorants', 'synthetic', 'Red azo dye commonly known as Red 40 in the USA.', '7 mg/kg bw/day'],
    ['Carmine', '胭脂红', 'E120', 'INS 120', '1390-65-4', 'colorants', 'natural', 'Red colorant derived from cochineal insects.', '5 mg/kg bw/day'],
    ['Beta-Carotene', 'β-胡萝卜素', 'E160a', 'INS 160a', '7235-40-7', 'colorants', 'natural', 'Orange-yellow colorant and vitamin A precursor.', 'Not specified (safe)'],
    ['Curcumin', '姜黄素', 'E100', 'INS 100', '458-37-7', 'colorants', 'natural', 'Yellow colorant derived from turmeric.', '3 mg/kg bw/day'],
    ['Brilliant Blue FCF', '亮蓝', 'E133', 'INS 133', '3844-45-9', 'colorants', 'synthetic', 'Blue triphenylmethane dye used in beverages and desserts.', '6 mg/kg bw/day'],
    // Sweeteners
    ['Aspartame', '阿斯巴甜', 'E951', 'INS 951', '22839-47-0', 'sweeteners', 'intense', 'Dipeptide sweetener, 200x sweeter than sucrose.', '40 mg/kg bw/day'],
    ['Stevia Glycosides', '甜菊糖苷', 'E960', 'INS 960', '57817-89-7', 'sweeteners', 'intense', 'Natural intense sweetener from Stevia rebaudiana.', '4 mg/kg bw/day'],
    ['Sucralose', '三氯蔗糖', 'E955', 'INS 955', '56038-13-2', 'sweeteners', 'intense', 'Chlorinated sucrose derivative, 600x sweeter than sucrose.', '15 mg/kg bw/day'],
    ['Acesulfame K', '安赛蜜', 'E950', 'INS 950', '55589-62-3', 'sweeteners', 'intense', 'Synthetic sweetener 200x sweeter than sucrose.', '15 mg/kg bw/day'],
    ['Saccharin', '糖精', 'E954', 'INS 954', '81-07-2', 'sweeteners', 'intense', 'Oldest synthetic sweetener, 300-400x sweeter than sucrose.', '5 mg/kg bw/day'],
    ['Erythritol', '赤藓糖醇', 'E968', 'INS 968', '149-32-6', 'sweeteners', 'bulk', 'Sugar alcohol with ~70% sweetness of sucrose, zero calories.', 'Not specified'],
    ['Allulose', '阿洛酮糖', '-', '-', '551-68-8', 'sweeteners', 'bulk', 'Rare sugar with 70% sweetness but 90% fewer calories.', 'Not specified'],
    // Preservatives
    ['Sodium Benzoate', '苯甲酸钠', 'E211', 'INS 211', '532-32-1', 'preservatives', 'chemical', 'Antimicrobial preservative for acidic foods and beverages.', '5 mg/kg bw/day'],
    ['Sorbic Acid', '山梨酸', 'E200', 'INS 200', '110-44-1', 'preservatives', 'chemical', 'Antifungal preservative used in cheese, baked goods, wines.', '25 mg/kg bw/day'],
    ['Natamycin', '纳他霉素', 'E235', 'INS 235', '7681-93-8', 'preservatives', 'natural', 'Natural antifungal for cheese surfaces and sausage casings.', '0.3 mg/kg bw/day'],
    ['Nisin', '乳酸链球菌素', 'E234', 'INS 234', '1414-45-5', 'preservatives', 'natural', 'Natural antimicrobial peptide effective against gram-positive bacteria.', 'Not specified'],
    // Emulsifiers
    ['Lecithin', '卵磷脂', 'E322', 'INS 322', '8002-43-5', 'emulsifiers', 'natural', 'Natural phospholipid emulsifier from soybeans or eggs.', 'Not specified'],
    ['Carrageenan', '卡拉胶', 'E407', 'INS 407', '9000-07-1', 'emulsifiers', 'natural', 'Polysaccharide thickener and gelling agent from red seaweed.', 'Not specified'],
    // Flavor enhancers
    ['Monosodium Glutamate', '谷氨酸钠(味精)', 'E621', 'INS 621', '142-47-2', 'flavor_enhancers', 'amino_acid', 'Sodium salt of glutamic acid; umami flavor enhancer.', 'Not specified (GRAS)'],
    ['Disodium Inosinate', '肌苷酸二钠', 'E631', 'INS 631', '4691-65-0', 'flavor_enhancers', 'nucleotide', 'Nucleotide synergist used with MSG for umami enhancement.', 'Not specified'],
    // Antioxidants
    ['Ascorbic Acid', '抗坏血酸(维生素C)', 'E300', 'INS 300', '50-81-7', 'antioxidants', 'natural', 'Vitamin C; antioxidant and color preservative.', 'Not specified'],
    ['BHA', '丁基羟基茴香醚', 'E320', 'INS 320', '25013-16-5', 'antioxidants', 'synthetic', 'Synthetic antioxidant for fats and oils.', '0.5 mg/kg bw/day'],
    ['Tocopherols', '生育酚(维生素E)', 'E306-309', 'INS 306-309', '1406-18-4', 'antioxidants', 'natural', 'Vitamin E group; natural antioxidants for oils.', 'Not specified'],
    // Thickeners
    ['Xanthan Gum', '黄原胶', 'E415', 'INS 415', '11138-66-2', 'thickeners', 'microbial', 'Bacterial polysaccharide thickener and stabilizer.', 'Not specified'],
    ['Modified Starch', '变性淀粉', 'E1400-1450', 'INS 1400', '-', 'thickeners', 'plant', 'Chemically or physically modified starch for texture.', 'Not specified'],
    // Acidity regulators
    ['Citric Acid', '柠檬酸', 'E330', 'INS 330', '77-92-9', 'acidity_regulators', 'natural', 'Natural organic acid; acidity regulator and antioxidant synergist.', 'Not specified'],
    ['Phosphoric Acid', '磷酸', 'E338', 'INS 338', '7664-38-2', 'acidity_regulators', 'mineral', 'Inorganic acid used mainly in cola beverages.', '70 mg/kg bw/day (as P)'],
  ];

  const substanceIds = {};
  for (const s of substances) {
    const { lastInsertRowid } = insertSubstance.run(...s);
    substanceIds[s[0]] = lastInsertRowid;
  }

  // Country regulations for key substances
  const regulations = [
    // Titanium Dioxide (E171)
    [substanceIds['Titanium Dioxide'], 'EU', '欧盟', 'banned', 'N/A', '所有食品', 'Regulation (EU) 2022/63', '2022-08-07', '2022年8月起禁止在食品中使用，因纳米颗粒安全疑虑', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0063'],
    [substanceIds['Titanium Dioxide'], 'US', '美国', 'approved', 'GMP', '糖果、口香糖、涂层等', '21 CFR 73.575', null, 'FDA批准为色素添加剂，符合GMP要求', 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-73/subpart-A/section-73.575'],
    [substanceIds['Titanium Dioxide'], 'CN', '中国', 'approved', 'GMP', '糖果、口香糖、植脂末等', 'GB 2760-2024', '2025-02-08', 'GB 2760规定在特定食品中按GMP使用', 'https://www.nhc.gov.cn/sps/'],
    [substanceIds['Titanium Dioxide'], 'AU', '澳大利亚/新西兰', 'approved', 'GMP', '多类食品', 'FSANZ Standard 1.3.1', null, null, null],
    [substanceIds['Titanium Dioxide'], 'SG', '新加坡', 'approved', 'GMP', '多类食品', 'SFA Food Regulations', null, null, null],
    [substanceIds['Titanium Dioxide'], 'SA', '沙特阿拉伯', 'approved', 'GMP', '多类食品', 'GSO 654', null, 'GCC地区遵循海湾标准', null],

    // Tartrazine (E102)
    [substanceIds['Tartrazine'], 'EU', '欧盟', 'restricted', '100 mg/kg', '饮料、糖果、腌鱼等', 'Regulation (EC) No 1333/2008 Annex II', null, '需标注警示语"可能对儿童活动力和注意力有不良影响"', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1333'],
    [substanceIds['Tartrazine'], 'US', '美国', 'approved', 'GMP', '广泛用于饮料、糖果等', '21 CFR 74.705', null, 'FD&C Yellow No.5，需在标签上标注', null],
    [substanceIds['Tartrazine'], 'CN', '中国', 'approved', '100 mg/kg', '碳酸饮料、配制酒等', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Tartrazine'], 'MY', '马来西亚', 'approved', '100 mg/kg', '多类食品', 'Food Regulations 1985', null, null, null],
    [substanceIds['Tartrazine'], 'NO', '挪威', 'banned', 'N/A', '所有食品', 'Norwegian Food Law', null, '挪威禁止使用偶氮染料', null],

    // Allura Red (E129)
    [substanceIds['Allura Red AC'], 'EU', '欧盟', 'restricted', '25-300 mg/kg', '特定饮料、糖果等', 'Regulation (EC) No 1333/2008', null, '需标注儿童活动力警示语', null],
    [substanceIds['Allura Red AC'], 'US', '美国', 'approved', 'GMP', '广泛使用', '21 CFR 74.340', null, 'FD&C Red No.40，最常用的红色食品色素', null],
    [substanceIds['Allura Red AC'], 'CN', '中国', 'approved', '50 mg/kg', '碳酸饮料等特定食品', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Allura Red AC'], 'JP', '日本', 'banned', 'N/A', '所有食品', 'Food Sanitation Act', null, '日本不允许使用偶氮红色染料', null],
    [substanceIds['Allura Red AC'], 'SG', '新加坡', 'approved', '300 mg/kg', '特定食品', 'SFA Food Regulations', null, null, null],
    [substanceIds['Allura Red AC'], 'AE', '阿联酋', 'approved', '300 mg/kg', '特定食品', 'UAE.S 37', null, '海湾合作委员会标准', null],

    // Aspartame (E951)
    [substanceIds['Aspartame'], 'EU', '欧盟', 'approved', '200-600 mg/kg', '无糖饮料、甜点、口香糖等', 'Regulation (EC) No 1333/2008', null, 'EFSA 2013年重新评估确认安全性，需标注"含苯丙氨酸"', null],
    [substanceIds['Aspartame'], 'US', '美国', 'approved', 'GMP', '广泛批准', '21 CFR 172.804', null, 'FDA批准，苯丙酮尿症患者需注意', null],
    [substanceIds['Aspartame'], 'CN', '中国', 'approved', '1000 mg/kg', '特定食品类别', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Aspartame'], 'SA', '沙特阿拉伯', 'approved', '1000 mg/kg', '特定食品', 'GSO 654', null, null, null],
    [substanceIds['Aspartame'], 'TH', '泰国', 'approved', '600 mg/kg', '特定饮料', 'TISI Standards', null, null, null],

    // Stevia (E960)
    [substanceIds['Stevia Glycosides'], 'EU', '欧盟', 'approved', '80-330 mg/kg', '饮料、甜点、口香糖等', 'Regulation (EU) No 1131/2011', '2011-12-02', null, null],
    [substanceIds['Stevia Glycosides'], 'US', '美国', 'approved', 'GMP', '广泛食品类别', 'GRAS (FDA)', null, 'GRAS公告，不需要上市前批准', null],
    [substanceIds['Stevia Glycosides'], 'CN', '中国', 'approved', '0.2 g/kg', '多类食品', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Stevia Glycosides'], 'JP', '日本', 'approved', 'GMP', '广泛使用', 'Japan FOSHU', null, '日本早在1970年代即批准使用', null],
    [substanceIds['Stevia Glycosides'], 'MY', '马来西亚', 'approved', '0.2 g/kg', '特定食品', 'Food Regulations 1985', null, null, null],
    [substanceIds['Stevia Glycosides'], 'ID', '印度尼西亚', 'approved', '200 mg/kg', '特定食品', 'BPOM Regulation', null, null, null],

    // Sodium Benzoate (E211)
    [substanceIds['Sodium Benzoate'], 'EU', '欧盟', 'restricted', '150-2000 mg/kg', '酸性饮料、腌菜等', 'Regulation (EC) No 1333/2008', null, '与抗坏血酸共存可能生成苯，需标注', null],
    [substanceIds['Sodium Benzoate'], 'US', '美国', 'approved', 'GMP (≤0.1%)', '酸性食品', '21 CFR 184.1733', null, 'GRAS状态', null],
    [substanceIds['Sodium Benzoate'], 'CN', '中国', 'approved', '2000 mg/kg', '碳酸饮料、醋、酱油等', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Sodium Benzoate'], 'SA', '沙特阿拉伯', 'approved', '1000 mg/kg', '特定食品', 'GSO 654', null, null, null],
    [substanceIds['Sodium Benzoate'], 'VN', '越南', 'approved', '2000 mg/kg', '特定食品', 'QCVN Standards', null, null, null],

    // MSG (E621)
    [substanceIds['Monosodium Glutamate'], 'EU', '欧盟', 'restricted', '10000 mg/kg', '调味料、零食等', 'Regulation (EC) No 1333/2008', null, '需在标签标注"含增味剂"', null],
    [substanceIds['Monosodium Glutamate'], 'US', '美国', 'approved', 'GMP', '广泛食品', '21 CFR 182.1(a)', null, 'GRAS状态，需在配料表中标注', null],
    [substanceIds['Monosodium Glutamate'], 'CN', '中国', 'approved', 'GMP', '广泛使用', 'GB 2760-2024', '2025-02-08', '按需使用，无特定限量', null],
    [substanceIds['Monosodium Glutamate'], 'MY', '马来西亚', 'approved', 'GMP', '多类食品', 'Food Regulations 1985', null, null, null],

    // Carmine (E120)
    [substanceIds['Carmine'], 'EU', '欧盟', 'approved', '100-500 mg/kg', '饮料、糖果、肉类等', 'Regulation (EC) No 1333/2008', null, '需标注"含胭脂红色素"，素食者和对其过敏者需注意', null],
    [substanceIds['Carmine'], 'US', '美国', 'approved', 'GMP', '多类食品', '21 CFR 73.100', null, '必须在标签中以"胭脂红"或"洋红"明确标注', null],
    [substanceIds['Carmine'], 'CN', '中国', 'approved', '0.05 g/kg', '特定食品', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Carmine'], 'MY', '马来西亚', 'banned', 'N/A', '所有食品', 'Food Regulations 1985', null, '马来西亚穆斯林食品不允许使用昆虫来源色素', null],
    [substanceIds['Carmine'], 'SA', '沙特阿拉伯', 'banned', 'N/A', '所有食品', 'Saudi Halal Standards', null, '清真认证食品禁止使用昆虫来源成分', null],
    [substanceIds['Carmine'], 'ID', '印度尼西亚', 'banned', 'N/A', '清真认证食品', 'MUI Halal Standards', null, '印尼清真食品不允许使用', null],

    // BHA
    [substanceIds['BHA'], 'EU', '欧盟', 'restricted', '100-200 mg/kg', '油脂、坚果等', 'Regulation (EC) No 1333/2008', null, '正在重新评估安全性', null],
    [substanceIds['BHA'], 'US', '美国', 'approved', '200 ppm (油脂中)', '油脂、谷物等', '21 CFR 172.110', null, 'GRAS', null],
    [substanceIds['BHA'], 'CN', '中国', 'approved', '200 mg/kg', '食用油脂等', 'GB 2760-2024', '2025-02-08', null, null],

    // Beta-Carotene
    [substanceIds['Beta-Carotene'], 'EU', '欧盟', 'approved', 'GMP (天然) / 100 mg/kg (合成)', '多类食品', 'Regulation (EC) No 1333/2008', null, null, null],
    [substanceIds['Beta-Carotene'], 'US', '美国', 'approved', 'GMP', '多类食品', '21 CFR 73.95 & 21 CFR 73.450', null, null, null],
    [substanceIds['Beta-Carotene'], 'CN', '中国', 'approved', 'GMP', '多类食品', 'GB 2760-2024', '2025-02-08', null, null],

    // Erythritol
    [substanceIds['Erythritol'], 'EU', '欧盟', 'approved', 'GMP', '减糖产品', 'Regulation (EC) No 1333/2008', null, null, null],
    [substanceIds['Erythritol'], 'US', '美国', 'approved', 'GMP', '广泛使用', 'GRAS (FDA)', null, null, null],
    [substanceIds['Erythritol'], 'CN', '中国', 'approved', 'GMP', '多类食品', 'GB 2760-2024', '2025-02-08', null, null],
    [substanceIds['Erythritol'], 'JP', '日本', 'approved', 'GMP', '多类食品', 'Japan Standards', null, null, null],

    // Allulose
    [substanceIds['Allulose'], 'US', '美国', 'approved', 'GMP', '多类食品', 'GRAS (FDA)', '2019-04-17', '2019年FDA豁免其进入总糖标签计算', null],
    [substanceIds['Allulose'], 'JP', '日本', 'approved', 'GMP', '多类食品', 'Japan Standards', null, '日本批准', null],
    [substanceIds['Allulose'], 'SG', '新加坡', 'approved', 'GMP', '特定食品', 'SFA Approval', '2021-01-01', null, null],
    [substanceIds['Allulose'], 'CN', '中国', 'pending', 'N/A', '待批', '申请中', null, '正在申请新食品原料审批', null],
    [substanceIds['Allulose'], 'EU', '欧盟', 'pending', 'N/A', '待批', '申请中', null, '正在进行新型食品申请', null],
    [substanceIds['Allulose'], 'KR', '韩国', 'approved', 'GMP', '多类食品', 'MFDS Regulation', null, null, null],
  ];

  for (const r of regulations) {
    insertReg.run(...r);
  }

  // Regulatory updates
  const updates = [
    ['EU Bans Titanium Dioxide (E171) in Food', '欧盟正式禁止食品中使用二氧化钛(E171)', 'The European Commission has formally banned the use of titanium dioxide as a food additive in all food products. The ban took effect on 7 August 2022 following EFSA\'s 2021 opinion that E171 can no longer be considered safe. Manufacturers had 6 months to reformulate products.', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0063', 'EUR-Lex', 'eu', 'EU', 'colorants', '["Titanium Dioxide"]', 'ban', '2022-08-07', '2022-01-18', 'en', 0.98],
    ['FDA Concludes Allulose Can Be Excluded from Total and Added Sugars', 'FDA确认阿洛酮糖可从总糖和添加糖标签中排除', 'The FDA has issued guidance that allulose, a rare sugar that occurs naturally in small quantities in some foods, can be excluded from the "Total Sugars" and "Added Sugars" declarations on the Nutrition Facts Label, while still being counted as a total carbohydrate.', 'https://www.fda.gov/food/cfsan-constituent-updates/fda-issues-guidance-allulose', 'FDA', 'usa', 'US', 'sweeteners', '["Allulose"]', 'guidance', '2019-04-17', '2019-04-17', 'en', 0.95],
    ['China GB 2760-2024 Released, Effective February 2025', '中国GB 2760-2024发布，2025年2月起施行', 'China\'s National Health Commission released the updated GB 2760-2024 food additive standard. The new standard includes 78 newly approved food additives, 27 extended uses, and 14 deletions. Titanium dioxide remains approved for specific food categories under GMP. The standard takes effect on February 8, 2025.', 'https://www.nhc.gov.cn/sps/', '中国国家卫生健康委员会', 'china', 'CN', 'general', '["Titanium Dioxide","Stevia Glycosides","Aspartame"]', 'new_regulation', '2025-02-08', '2024-03-15', 'zh', 0.99],
    ['EFSA Concludes Aspartame is Safe, IARC Classifies as Possible Carcinogen', 'EFSA确认阿斯巴甜安全，IARC将其列为可能致癌物', 'Following IARC\'s classification of aspartame as "possibly carcinogenic to humans" (Group 2B) in July 2023, EFSA reaffirmed that aspartame is safe for consumption at current approved levels (40 mg/kg bw/day). WHO also maintained existing ADI guidance. The divergent scientific opinions have caused significant industry confusion.', 'https://www.efsa.europa.eu/en/news/efsa-updates-safety-assessment-aspartame', 'EFSA', 'eu', 'EU', 'sweeteners', '["Aspartame"]', 'safety_assessment', null, '2023-07-14', 'en', 0.97],
    ['Singapore Approves Allulose as Novel Food Ingredient', '新加坡批准阿洛酮糖作为新型食品原料', 'Singapore\'s Singapore Food Agency (SFA) has approved allulose for use as a food ingredient. This makes Singapore one of the first Asian markets to formally approve the rare sugar. Companies must notify SFA before marketing products containing allulose.', 'https://www.sfa.gov.sg/', 'Singapore Food Agency', 'sea', 'SG', 'sweeteners', '["Allulose"]', 'approval', '2021-01-01', '2021-02-15', 'en', 0.92],
    ['ASEAN Harmonization of Food Additives Moves Forward', '东盟食品添加剂法规协调取得进展', 'ASEAN member states have made progress on harmonizing food additive regulations through the ASEAN Food and Agriculture Organization. The harmonization covers sweeteners, colorants, and preservatives with a target of alignment with Codex Alimentarius standards by 2026.', 'https://asean.org/asean-economic-community/aec-sectoral-bodies/', 'ASEAN Secretariat', 'sea', 'ASEAN', 'general', '[]', 'consultation', null, '2024-06-10', 'en', 0.88],
    ['Saudi Arabia Updates Halal Food Standards, Banning Carmine', '沙特更新清真食品标准，禁用胭脂红色素', 'Saudi Arabia\'s Saudi Food and Drug Authority (SFDA) has updated its halal food standards to explicitly prohibit carmine (E120) and other insect-derived colorants in all food products sold in the kingdom. The update aligns with GCC halal certification requirements.', 'https://www.sfda.gov.sa/', 'SFDA Saudi Arabia', 'mea', 'SA', 'colorants', '["Carmine"]', 'ban', '2024-03-01', '2024-01-20', 'en', 0.96],
    ['EU Proposes Limits on Tartrazine in Beverages', '欧盟提议对饮料中柠檬黄设定新限量', 'The European Commission is proposing to reduce the maximum permitted level of tartrazine (E102) in non-alcoholic beverages from 100 mg/L to 50 mg/L, citing concerns about hyperactivity in children. A public consultation period of 6 weeks has been opened.', 'https://ec.europa.eu/food/safety/food_improvement_agents/additives_en', 'European Commission', 'eu', 'EU', 'colorants', '["Tartrazine"]', 'consultation', null, '2024-09-05', 'en', 0.91],
    ['Indonesia BPOM Updates Novel Food Regulations, Including Stevia', '印尼BPOM更新新型食品法规，纳入甜菊糖', 'Indonesia\'s Food and Drug Authority (BPOM) has updated regulations for novel foods and food ingredients, formally including steviol glycosides (stevia) with a maximum permitted level of 200 mg/kg in certain food categories. The regulation provides clarity for manufacturers seeking BPOM approval.', 'https://www.pom.go.id/', 'BPOM Indonesia', 'sea', 'ID', 'sweeteners', '["Stevia Glycosides"]', 'new_regulation', null, '2023-11-20', 'en', 0.89],
    ['US FDA Issues Draft Guidance on Natural Color Claims', 'FDA发布天然色素声明指导草案', 'The FDA has issued draft guidance addressing when color additives derived from natural sources can be labeled as "natural" on food packaging. The guidance clarifies labeling requirements for plant-based, mineral, and microbial colorants, including beta-carotene, curcumin, and spirulina.', 'https://www.fda.gov/food/food-additives-petitions/color-additives', 'FDA', 'usa', 'US', 'colorants', '["Beta-Carotene","Curcumin"]', 'guidance', null, '2024-05-22', 'en', 0.87],
    ['Malaysia Bans Certain Synthetic Azo Dyes', '马来西亚禁止部分合成偶氮染料', 'The Malaysian Ministry of Health has issued new regulations restricting the use of certain synthetic azo dyes in children\'s food products and beverages. Tartrazine (E102) and Sunset Yellow (E110) will require mandatory warning labels on products targeting children under 12.', 'https://www.moh.gov.my/', 'Malaysian Ministry of Health', 'sea', 'MY', 'colorants', '["Tartrazine","Sunset Yellow FCF"]', 'new_regulation', '2025-01-01', '2024-08-15', 'en', 0.93],
    ['China National Standard for Natamycin in Food Updated', '中国食品中纳他霉素国家标准更新', '中国国家卫生健康委员会对食品中纳他霉素（乳酸链球菌素）的使用标准进行了更新。新标准明确了在干酪表面、熟肉制品和糕点中的最大使用量，限量为0.3 mg/kg（以表面残留计）。', 'https://www.nhc.gov.cn/', '国家卫生健康委员会', 'china', 'CN', 'preservatives', '["Natamycin"]', 'amendment', '2025-02-08', '2024-02-10', 'zh', 0.90],
    ['UAE Adopts Codex Standards for Food Additives', '阿联酋采纳食品添加剂国际食品法典标准', 'The UAE Ministry of Climate Change and Environment has announced that the UAE will adopt Codex Alimentarius standards for food additives, effective January 2025. This harmonization effort aims to facilitate trade and ensure consumer protection across GCC member states.', 'https://www.moccae.gov.ae/', 'UAE Ministry of Climate Change', 'mea', 'AE', 'general', '[]', 'new_regulation', '2025-01-01', '2024-07-01', 'en', 0.85],
    ['EFSA Calls for Data on BHA Safety Re-evaluation', 'EFSA就BHA安全性重新评估征集数据', 'EFSA has opened a call for data for the re-evaluation of butylated hydroxyanisole (BHA, E320) as a food additive. The authority requires updated toxicological data, dietary exposure estimates, and analytical data to complete its safety assessment. Submission deadline is December 2024.', 'https://www.efsa.europa.eu/', 'EFSA', 'eu', 'EU', 'antioxidants', '["BHA"]', 'consultation', null, '2024-03-12', 'en', 0.88],
    ['South Korea Approves Expanded Uses of Allulose', '韩国批准扩大阿洛酮糖的使用范围', 'The Ministry of Food and Drug Safety (MFDS) of South Korea has approved expanded applications of allulose (rare sugar) in food products, including bakery goods, confectionery, and dairy products. South Korea has been a leading market for allulose given domestic production capabilities.', 'https://www.mfds.go.kr/', 'MFDS Korea', 'sea', 'KR', 'sweeteners', '["Allulose"]', 'approval', null, '2024-04-20', 'en', 0.86],
    ['Vietnam Updates Food Safety Law Covering Additives', '越南修订涵盖添加剂的食品安全法', 'Vietnam\'s Ministry of Health has updated its food safety regulations covering food additives. The new circular aligns permitted additives more closely with Codex standards and introduces new requirements for labeling food additives in multi-ingredient products. A transition period of 18 months applies.', 'https://www.moh.gov.vn/', 'Vietnam Ministry of Health', 'sea', 'VN', 'general', '[]', 'new_regulation', '2025-06-01', '2024-10-15', 'en', 0.84],
    ['EU Parliament Calls for Phase-out of Synthetic Colorants', '欧洲议会呼吁逐步淘汰合成色素', 'The European Parliament has adopted a resolution calling on the Commission to develop a roadmap for phasing out synthetic colorants in food products and replacing them with natural alternatives by 2030. The resolution specifically mentions tartrazine, sunset yellow, and allura red as priority targets.', 'https://www.europarl.europa.eu/', 'European Parliament', 'eu', 'EU', 'colorants', '["Tartrazine","Sunset Yellow FCF","Allura Red AC"]', 'consultation', null, '2024-11-28', 'en', 0.92],
    ['China Approves Hyaluronic Acid as New Food Ingredient', '中国批准透明质酸钠作为新食品原料', '国家卫生健康委员会批准透明质酸钠（玻尿酸）作为普通食品原料使用，可用于乳及乳制品、饮料、酒类、糖果等食品中。这一批准使中国成为全球首批将其纳入普通食品的市场之一。每日摄入量建议不超过200 mg。', 'https://www.nhc.gov.cn/', '国家卫生健康委员会', 'china', 'CN', 'functional_ingredients', '[]', 'approval', '2021-01-07', '2021-01-07', 'zh', 0.94],
    ['FDA Warns Against NMN Supplements as Food Ingredient', 'FDA警告NMN不得作为食品原料使用', 'The FDA has stated that nicotinamide mononucleotide (NMN) cannot be marketed as a dietary supplement because it was first studied as a drug. This significantly impacts the dietary supplement industry, which had been selling NMN as an anti-aging ingredient.', 'https://www.fda.gov/', 'FDA', 'usa', 'US', 'functional_ingredients', '[]', 'ban', null, '2024-02-05', 'en', 0.91],
    ['GCC Harmonized Standard for Food Colorants Updated', 'GCC统一食品色素标准更新', 'The Gulf Cooperation Council (GCC) has updated its harmonized standard for food colorants (GSO 654). The update revises maximum permitted levels for several synthetic colorants and formally bans carmine in products targeting Muslim consumers, aligning with halal certification requirements.', 'https://www.gso.org.sa/', 'GSO (Gulf Standards Organization)', 'mea', 'GCC', 'colorants', '["Carmine","Tartrazine"]', 'amendment', '2024-07-01', '2024-01-15', 'en', 0.93],
  ];

  for (const u of updates) {
    insertUpdate.run(...u);
  }

  console.log('Database seeded with sample regulatory data.');
}
