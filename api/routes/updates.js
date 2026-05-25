import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const db = req.db;
  const {
    q = '',
    region = '',
    category = '',
    update_type = '',
    country = '',
    page = 1,
    limit = 20,
    sort = 'published_at',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(`(title LIKE ? OR title_zh LIKE ? OR summary LIKE ? OR substance_refs LIKE ?)`);
    const qLike = `%${q}%`;
    params.push(qLike, qLike, qLike, qLike);
  }
  if (region) {
    conditions.push(`region = ?`);
    params.push(region);
  }
  if (category) {
    conditions.push(`category = ?`);
    params.push(category);
  }
  if (update_type) {
    conditions.push(`update_type = ?`);
    params.push(update_type);
  }
  if (country) {
    conditions.push(`country_code = ?`);
    params.push(country);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol = ['published_at', 'relevance', 'title'].includes(sort) ? sort : 'published_at';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM regulatory_updates ${where}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM regulatory_updates ${where} ORDER BY ${sortCol} DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  res.json({
    total: countRow.total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(r => ({
      ...r,
      substance_refs: r.substance_refs ? JSON.parse(r.substance_refs) : [],
    })),
  });
});

router.get('/:id', (req, res) => {
  const row = req.db.prepare('SELECT * FROM regulatory_updates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, substance_refs: row.substance_refs ? JSON.parse(row.substance_refs) : [] });
});

export default router;
