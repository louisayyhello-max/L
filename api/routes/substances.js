import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const db = req.db;
  const { q = '', category = '', page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(`(name_en LIKE ? OR name_zh LIKE ? OR e_number LIKE ? OR cas_number LIKE ? OR ins_number LIKE ?)`);
    const qLike = `%${q}%`;
    params.push(qLike, qLike, qLike, qLike, qLike);
  }
  if (category) {
    conditions.push(`category = ?`);
    params.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM substances ${where}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM substances ${where} ORDER BY category, name_en LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  res.json({ total: countRow.total, page: parseInt(page), limit: parseInt(limit), data: rows });
});

router.get('/:id', (req, res) => {
  const db = req.db;
  const substance = db.prepare('SELECT * FROM substances WHERE id = ?').get(req.params.id);
  if (!substance) return res.status(404).json({ error: 'Not found' });

  const regulations = db.prepare(
    'SELECT * FROM country_regulations WHERE substance_id = ? ORDER BY country_name'
  ).all(req.params.id);

  res.json({ ...substance, regulations });
});

router.get('/:id/compare', (req, res) => {
  const db = req.db;
  const substance = db.prepare('SELECT * FROM substances WHERE id = ?').get(req.params.id);
  if (!substance) return res.status(404).json({ error: 'Not found' });

  const regulations = db.prepare(
    'SELECT * FROM country_regulations WHERE substance_id = ? ORDER BY country_name'
  ).all(req.params.id);

  const recentUpdates = db.prepare(
    `SELECT id, title, title_zh, published_at, update_type, region, url
     FROM regulatory_updates
     WHERE substance_refs LIKE ?
     ORDER BY published_at DESC LIMIT 5`
  ).all(`%${substance.name_en}%`);

  res.json({ substance, regulations, recent_updates: recentUpdates });
});

export default router;
