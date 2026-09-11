import { PoolClient } from 'pg';
import { pool } from '../config/db';
import { ChallanInput } from '../validators/challan.validator';

type ChallanItem = {
  productId: number;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

async function generateChallanNumber(client: PoolClient): Promise<string> {
  await client.query('LOCK TABLE sales_challans IN SHARE ROW EXCLUSIVE MODE');
  const result = await client.query<{ next_number: string }>(
    `SELECT COALESCE(MAX(
       NULLIF(regexp_replace(challan_number, '^SC-[0-9]{4}-', ''), '')::INTEGER
     ), 0) + 1 AS next_number
     FROM sales_challans
     WHERE challan_number LIKE $1`,
    [`SC-${new Date().getFullYear()}-%`],
  );
  const nextNumber = Number(result.rows[0].next_number);
  return `SC-${new Date().getFullYear()}-${String(nextNumber).padStart(6, '0')}`;
}

async function validateAndLoadData(client: PoolClient, input: ChallanInput) {
  const customer = await client.query(
    'SELECT id, customer_name, business_name, mobile, email FROM customers WHERE id = $1',
    [input.customerId],
  );
  if (!customer.rows[0]) return { kind: 'customer_not_found' as const };

  const productIds = input.items.map((item) => item.productId);
  const products = await client.query(
    `SELECT id, product_name, sku, unit_price
     FROM products
     WHERE id = ANY($1::INTEGER[])`,
    [productIds],
  );
  if (products.rows.length !== productIds.length) {
    return { kind: 'product_not_found' as const };
  }

  const productById = new Map(products.rows.map((product) => [product.id, product]));
  const items = input.items.map((item) => {
    const product = productById.get(item.productId);
    const lineTotal = Number(product.unit_price) * item.quantity;
    return {
      productId: item.productId,
      productName: product.product_name,
      sku: product.sku,
      unitPrice: product.unit_price,
      quantity: item.quantity,
      lineTotal,
    };
  });

  return {
    kind: 'valid' as const,
    customer: customer.rows[0],
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

async function insertItems(client: PoolClient, challanId: number, items: ChallanItem[]) {
  for (const item of items) {
    await client.query(
      `INSERT INTO sales_challan_items
        (challan_id, product_id, product_name_snapshot, sku_snapshot,
         unit_price_snapshot, quantity, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        challanId,
        item.productId,
        item.productName,
        item.sku,
        item.unitPrice,
        item.quantity,
        item.lineTotal,
      ],
    );
  }
}

export async function createChallan(input: ChallanInput, createdBy: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loaded = await validateAndLoadData(client, input);
    if (loaded.kind !== 'valid') {
      await client.query('ROLLBACK');
      return loaded;
    }
    const challanNumber = await generateChallanNumber(client);
    const challan = await client.query(
      `INSERT INTO sales_challans
        (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ($1, $2, $3, 'DRAFT', $4)
       RETURNING *`,
      [challanNumber, input.customerId, loaded.totalQuantity, createdBy],
    );
    await insertItems(client, challan.rows[0].id, loaded.items);
    await client.query('COMMIT');
    return { kind: 'success' as const, challan: challan.rows[0], items: loaded.items };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listChallans(query: {
  search?: string;
  status?: string;
  customerId?: number;
  page: number;
  limit: number;
}) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(`(sc.challan_number ILIKE $${values.length} OR c.business_name ILIKE $${values.length})`);
  }
  if (query.status) {
    values.push(query.status);
    filters.push(`sc.status = $${values.length}`);
  }
  if (query.customerId) {
    values.push(query.customerId);
    filters.push(`sc.customer_id = $${values.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM sales_challans sc JOIN customers c ON c.id = sc.customer_id ${where}`,
    values,
  );
  const total = Number(count.rows[0].total);
  const offset = (query.page - 1) * query.limit;
  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;
  const rows = await pool.query(
    `SELECT sc.id, sc.challan_number, sc.customer_id,
            c.business_name, c.customer_name, sc.total_quantity,
            sc.status, sc.created_by, u.name AS created_by_name,
            sc.created_at, sc.updated_at
     FROM sales_challans sc
     JOIN customers c ON c.id = sc.customer_id
     JOIN users u ON u.id = sc.created_by
     ${where}
     ORDER BY sc.id DESC
     LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
    [...values, query.limit, offset],
  );
  return {
    rows: rows.rows,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getChallan(id: number) {
  const challan = await pool.query(
    `SELECT sc.*, c.customer_name, c.business_name, c.mobile, c.email,
            u.name AS created_by_name
     FROM sales_challans sc
     JOIN customers c ON c.id = sc.customer_id
     JOIN users u ON u.id = sc.created_by
     WHERE sc.id = $1`,
    [id],
  );
  if (!challan.rows[0]) return null;
  const items = await pool.query(
    `SELECT id, product_id, product_name_snapshot, sku_snapshot,
            unit_price_snapshot, quantity, line_total
     FROM sales_challan_items
     WHERE challan_id = $1
     ORDER BY id`,
    [id],
  );
  return { challan: challan.rows[0], items: items.rows };
}

export async function updateChallan(id: number, input: ChallanInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id, status FROM sales_challans WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return { kind: 'challan_not_found' as const };
    }
    if (existing.rows[0].status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return { kind: 'not_editable' as const };
    }
    const loaded = await validateAndLoadData(client, input);
    if (loaded.kind !== 'valid') {
      await client.query('ROLLBACK');
      return loaded;
    }
    await client.query(
      `UPDATE sales_challans
       SET customer_id = $1, total_quantity = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [input.customerId, loaded.totalQuantity, id],
    );
    await client.query('DELETE FROM sales_challan_items WHERE challan_id = $1', [id]);
    await insertItems(client, id, loaded.items);
    await client.query('COMMIT');
    return { kind: 'success' as const, result: await getChallan(id) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelChallan(id: number, cancelledBy: number, role: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      id: number;
      status: string;
      challan_number: string;
    }>(
      `SELECT id, status, challan_number
       FROM sales_challans
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    const challan = result.rows[0];
    if (!challan) {
      await client.query('ROLLBACK');
      return { kind: 'challan_not_found' as const };
    }
    if (challan.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return { kind: 'already_cancelled' as const };
    }
    if (challan.status !== 'DRAFT' && challan.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');
      return { kind: 'invalid_state' as const, status: challan.status };
    }
    if (challan.status === 'CONFIRMED' && role !== 'ADMIN') {
      await client.query('ROLLBACK');
      return { kind: 'forbidden_confirmed' as const };
    }
    if (challan.status === 'CONFIRMED') {
      const items = await client.query<{ product_id: number; quantity: number }>(
        `SELECT product_id, quantity
         FROM sales_challan_items
         WHERE challan_id = $1
         ORDER BY product_id
         FOR UPDATE`,
        [id],
      );
      const productIds = items.rows.map((item) => item.product_id);
      const products = await client.query<{ id: number }>(
        `SELECT id FROM products
         WHERE id = ANY($1::INTEGER[])
         ORDER BY id
         FOR UPDATE`,
        [productIds],
      );
      const foundIds = new Set(products.rows.map((product) => product.id));
      const missingId = productIds.find((productId) => !foundIds.has(productId));
      if (missingId) {
        await client.query('ROLLBACK');
        return { kind: 'product_not_found' as const, productId: missingId };
      }
      for (const item of items.rows) {
        await client.query(
          `UPDATE products
           SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, item.product_id],
        );
        await client.query(
          `INSERT INTO stock_movements
            (product_id, quantity_changed, movement_type, reason, created_by)
           VALUES ($1, $2, 'IN', $3, $4)`,
          [
            item.product_id,
            item.quantity,
            `Challan cancellation: ${challan.challan_number}`,
            cancelledBy,
          ],
        );
      }
    }
    const updated = await client.query(
      `UPDATE sales_challans
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    await client.query('COMMIT');
    return { kind: 'success' as const, challan: updated.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmChallan(id: number, confirmedBy: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query<{ id: number; status: string; challan_number: string }>(
      `SELECT id, status, challan_number
       FROM sales_challans
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    const challan = challanResult.rows[0];
    if (!challan) {
      await client.query('ROLLBACK');
      return { kind: 'challan_not_found' as const };
    }

    if (challan.status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return { kind: 'not_confirmable' as const, status: challan.status };
    }

    const itemsResult = await client.query<{
      product_id: number;
      quantity: number;
    }>(
      `SELECT product_id, quantity
       FROM sales_challan_items
       WHERE challan_id = $1
       ORDER BY product_id
       FOR UPDATE`,
      [id],
    );
    if (!itemsResult.rows.length) {
      await client.query('ROLLBACK');
      return { kind: 'empty_challan' as const };
    }

    const productIds = itemsResult.rows.map((item) => item.product_id);
    const productsResult = await client.query<{
      id: number;
      current_stock: number;
    }>(
      `SELECT id, current_stock
       FROM products
       WHERE id = ANY($1::INTEGER[])
       ORDER BY id
       FOR UPDATE`,
      [productIds],
    );
    const productsById = new Map(productsResult.rows.map((product) => [product.id, product]));

    for (const item of itemsResult.rows) {
      const product = productsById.get(item.product_id);
      if (!product) {
        await client.query('ROLLBACK');
        return { kind: 'product_not_found' as const, productId: item.product_id };
      }
      if (product.current_stock < item.quantity) {
        await client.query('ROLLBACK');
        return {
          kind: 'insufficient_stock' as const,
          productId: product.id,
          available: product.current_stock,
          requested: item.quantity,
        };
      }
    }



    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products
         SET current_stock = current_stock - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity, item.product_id],
      );
      await client.query(
        `INSERT INTO stock_movements
          (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'OUT', $3, $4)`,
        [item.product_id, item.quantity, `Sales challan ${challan.challan_number}`, confirmedBy],
      );
    }

    await client.query(
      `UPDATE sales_challans
       SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id],
    );
    await client.query('COMMIT');
    return { kind: 'success' as const, challan: await getChallan(id) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
