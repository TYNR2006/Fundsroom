import { pool } from '../config/db';

export async function listCustomers(query: {
  search?: string; status?: string; customerType?: string; page: number; limit: number;
}) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(`(customer_name ILIKE $${values.length} OR mobile ILIKE $${values.length} OR business_name ILIKE $${values.length})`);
  }
  if (query.status) { values.push(query.status); filters.push(`status = $${values.length}`); }
  if (query.customerType) { values.push(query.customerType); filters.push(`customer_type = $${values.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM customers ${where}`, values);
  const offset = (query.page - 1) * query.limit;
  values.push(query.limit, offset);
  const rows = await pool.query(
    `SELECT * FROM customers ${where} ORDER BY id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  const total = Number(count.rows[0].total);
  return { rows: rows.rows, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getCustomer(id: number) {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createCustomer(input: Record<string, unknown>) {
  const result = await pool.query(
    `INSERT INTO customers (customer_name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [input.customer_name, input.mobile, input.email ?? null, input.business_name, input.gst_number ?? null,
      input.customer_type, input.address, input.status ?? 'LEAD', input.follow_up_date ?? null, input.notes ?? null],
  );
  return result.rows[0];
}

export async function updateCustomer(id: number, input: Record<string, unknown>) {
  const keys = Object.keys(input);
  if (!keys.length) return getCustomer(id);
  const values = keys.map((key) => input[key] ?? null);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  values.push(id);
  const result = await pool.query(
    `UPDATE customers SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function listFollowUps(customerId: number) {
  const result = await pool.query(
    `SELECT f.*, u.name AS created_by_name FROM follow_ups f JOIN users u ON u.id = f.created_by
     WHERE f.customer_id = $1 ORDER BY f.follow_up_date DESC, f.id DESC`, [customerId]);
  return result.rows;
}

export async function createFollowUp(customerId: number, createdBy: number, input: Record<string, unknown>) {
  const result = await pool.query(
    `INSERT INTO follow_ups (customer_id, follow_up_date, note, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [customerId, input.follow_up_date, input.note, createdBy],
  );
  return result.rows[0];
}
