import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';
import { logActivity } from '../services/activity.js';

const router = Router();

// List products with optional text search and active filter.
router.get('/', (req, res) => {
  const { search = '', active = '' } = req.query;
  const where = [];
  const params = [];
  if (search) {
    const like = `%${search}%`;
    where.push('(name LIKE ? OR sku LIKE ? OR category LIKE ?)');
    params.push(like, like, like);
  }
  if (active === 'true' || active === 'false') {
    where.push('active = ?');
    params.push(active === 'true' ? 1 : 0);
  }
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { name, sku, description, category, price, active } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Product name is required' });
  const priceNum = Number(price ?? 0);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Price must be a non-negative number' });

  const info = db
    .prepare('INSERT INTO products (name, sku, description, category, price, active) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, sku || null, description || null, category || null, priceNum, active === undefined || active ? 1 : 0);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  broadcast('product.created', product);
  logActivity({
    type: 'product.created',
    message: `Product "${name}" was created`,
    entityType: 'product',
    entityId: product.id,
    actorId: req.user.id,
  });
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { name, sku, description, category, price, active } = req.body || {};
  const priceNum = price === undefined ? existing.price : Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Price must be a non-negative number' });

  db.prepare(
    `UPDATE products SET name = ?, sku = ?, description = ?, category = ?, price = ?, active = ?,
       updated_at = datetime('now') WHERE id = ?`
  ).run(
    name ?? existing.name,
    sku === undefined ? existing.sku : sku || null,
    description === undefined ? existing.description : description || null,
    category === undefined ? existing.category : category || null,
    priceNum,
    active === undefined ? existing.active : active ? 1 : 0,
    req.params.id
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  broadcast('product.updated', product);
  logActivity({
    type: 'product.updated',
    message: `Product "${product.name}" was updated`,
    entityType: 'product',
    entityId: product.id,
    actorId: req.user.id,
  });
  res.json(product);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  broadcast('product.deleted', { id: Number(req.params.id) });
  logActivity({
    type: 'product.deleted',
    message: `Product "${existing.name}" was deleted`,
    entityType: 'product',
    entityId: existing.id,
    actorId: req.user.id,
  });
  res.json({ ok: true });
});

export default router;
