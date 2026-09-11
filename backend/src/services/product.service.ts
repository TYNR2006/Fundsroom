import { PoolClient } from 'pg';
import { pool } from '../config/db';

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function listProducts(query: {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page: number;
  limit: number;
}) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(`(product_name ILIKE $${values.length} OR sku ILIKE $${values.length})`);
  }
  if (query.category) {
    values.push(query.category);
    filters.push(`category = $${values.length}`);
  }
  if (query.lowStock) filters.push('current_stock <= minimum_stock_quantity');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM products ${where}`,
    values,
  );
  const total = Number(count.rows[0].total);
  const offset = (query.page - 1) * query.limit;
  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;
  const rows = await pool.query(
    `SELECT * FROM products ${where}
     ORDER BY id DESC LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
    [...values, query.limit, offset],
  );
  return { rows: rows.rows, pagination: pagination(query.page, query.limit, total) };
}

export async function getProduct(id: number) {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createProduct(input: Record<string, unknown>) {
  const result = await pool.query(
    `INSERT INTO products
      (product_name, sku, category, unit_price, current_stock, minimum_stock_quantity, warehouse_location)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.product_name,
      input.sku,
      input.category,
      input.unit_price,
      input.current_stock,
      input.minimum_stock_quantity,
      input.warehouse_location,
    ],
  );
  return result.rows[0];
}

export async function updateProduct(id: number, input: Record<string, unknown>) {
  const allowedFields = [
    'product_name',
    'sku',
    'category',
    'unit_price',
    'minimum_stock_quantity',
    'warehouse_location',
  ];
  const keys = Object.keys(input).filter((key) => allowedFields.includes(key));
  if (!keys.length) return getProduct(id);
  const values = keys.map((key) => input[key]);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  values.push(id);
  const result = await pool.query(
    `UPDATE products
     SET ${assignments}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

async function findLockedProduct(client: PoolClient, productId: number) {
  const result = await client.query<{
    id: number;
    current_stock: number;
  }>(
    'SELECT id, current_stock FROM products WHERE id = $1 FOR UPDATE',
    [productId],
  );
  return result.rows[0] ?? null;
}

export async function adjustStock(
  productId: number,
  quantity: number,
  movementType: 'IN' | 'OUT',
  reason: string,
  createdBy: number,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await findLockedProduct(client, productId);
    if (!product) {
      await client.query('ROLLBACK');
      return { kind: 'not_found' as const };
    }
    if (movementType === 'OUT' && quantity > product.current_stock) {
      await client.query('ROLLBACK');
      return {
        kind: 'insufficient_stock' as const,
        available: product.current_stock,
        requested: quantity,
      };
    }
    const change = movementType === 'IN' ? quantity : -quantity;
    const updated = await client.query(
      `UPDATE products
       SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [change, productId],
    );
    await client.query(
      `INSERT INTO stock_movements
        (product_id, quantity_changed, movement_type, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, quantity, movementType, reason, createdBy],
    );
    await client.query('COMMIT');
    return { kind: 'success' as const, product: updated.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listMovements(query: {
  productId?: number;
  movementType?: 'IN' | 'OUT';
  page: number;
  limit: number;
}) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.productId) {
    values.push(query.productId);
    filters.push(`sm.product_id = $${values.length}`);
  }
  if (query.movementType) {
    values.push(query.movementType);
    filters.push(`sm.movement_type = $${values.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM stock_movements sm ${where}`,
    values,
  );
  const total = Number(count.rows[0].total);
  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;
  const offset = (query.page - 1) * query.limit;
  const rows = await pool.query(
    `SELECT sm.id, sm.product_id, p.product_name, p.sku,
            sm.quantity_changed, sm.movement_type, sm.reason,
            sm.created_by, u.name AS created_by_name, sm.created_at
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN users u ON u.id = sm.created_by
     ${where}
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
    [...values, query.limit, offset],
  );
  return { rows: rows.rows, pagination: pagination(query.page, query.limit, total) };
}
