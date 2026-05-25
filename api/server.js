import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDB } from './db.js';
import updatesRouter from './routes/updates.js';
import substancesRouter from './routes/substances.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = initDB();

const dbMiddleware = (req, _res, next) => { req.db = db; next(); };

app.use('/api/updates', dbMiddleware, updatesRouter);
app.use('/api/substances', dbMiddleware, substancesRouter);

app.get('/api/stats', dbMiddleware, (req, res) => {
  const d = req.db;
  res.json({
    total_updates: d.prepare('SELECT COUNT(*) as c FROM regulatory_updates').get().c,
    total_substances: d.prepare('SELECT COUNT(*) as c FROM substances').get().c,
    total_regulations: d.prepare('SELECT COUNT(*) as c FROM country_regulations').get().c,
    by_region: d.prepare('SELECT region, COUNT(*) as count FROM regulatory_updates GROUP BY region ORDER BY count DESC').all(),
    by_category: d.prepare('SELECT category, COUNT(*) as count FROM regulatory_updates GROUP BY category ORDER BY count DESC').all(),
    by_type: d.prepare('SELECT update_type, COUNT(*) as count FROM regulatory_updates GROUP BY update_type ORDER BY count DESC').all(),
    recent: d.prepare('SELECT id, title, title_zh, region, category, update_type, published_at FROM regulatory_updates ORDER BY published_at DESC LIMIT 5').all(),
  });
});

app.get('/api/search', dbMiddleware, (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.json({ substances: [], updates: [] });
  const like = `%${q}%`;
  const substances = req.db.prepare(
    `SELECT id, name_en, name_zh, e_number, category FROM substances
     WHERE name_en LIKE ? OR name_zh LIKE ? OR e_number LIKE ? OR cas_number LIKE ?
     LIMIT 8`
  ).all(like, like, like, like);
  const updates = req.db.prepare(
    `SELECT id, title, title_zh, region, category, update_type, published_at FROM regulatory_updates
     WHERE title LIKE ? OR title_zh LIKE ? OR summary LIKE ?
     ORDER BY published_at DESC LIMIT 8`
  ).all(like, like, like);
  res.json({ substances, updates });
});

// Serve frontend static files in production
const distPath = join(__dirname, '..', 'webapp', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Food Regulations API running on http://localhost:${PORT}`);
  if (existsSync(distPath)) console.log(`  Frontend served from ${distPath}`);
});
