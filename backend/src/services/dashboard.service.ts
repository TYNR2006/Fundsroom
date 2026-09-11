import { pool } from '../config/db';

const recentLimit = 10;

export async function getSummary() {
  const [customers, products, challans, followUps] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
              COUNT(*) FILTER (WHERE status = 'LEAD')::int AS leads,
              COUNT(*) FILTER (WHERE status = 'INACTIVE')::int AS inactive
       FROM customers`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(current_stock), 0)::int AS total_stock_quantity,
              COUNT(*) FILTER (WHERE current_stock <= minimum_stock_quantity)::int AS low_stock,
              COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock
       FROM products`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
              COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
       FROM sales_challans`,
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE follow_up_date >= CURRENT_DATE)::int AS upcoming,
              COUNT(*) FILTER (WHERE follow_up_date < CURRENT_DATE)::int AS overdue
       FROM follow_ups
       WHERE follow_up_date IS NOT NULL`,
    ),
  ]);

  const customer = customers.rows[0];
  const product = products.rows[0];
  const challan = challans.rows[0];
  const followUp = followUps.rows[0];

  return {
    customers: {
      total: customer.total,
      active: customer.active,
      leads: customer.leads,
      inactive: customer.inactive,
    },
    products: {
      total: product.total,
      totalStockQuantity: product.total_stock_quantity,
      lowStock: product.low_stock,
      outOfStock: product.out_of_stock,
    },
    challans: {
      total: challan.total,
      draft: challan.draft,
      confirmed: challan.confirmed,
      cancelled: challan.cancelled,
    },
    followUps: {
      upcoming: followUp.upcoming,
      overdue: followUp.overdue,
    },
  };
}

export async function getInventory() {
  const [metrics, lowStock, outOfStock] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_products,
              COALESCE(SUM(current_stock), 0)::int AS total_stock_quantity,
              COUNT(*) FILTER (WHERE current_stock <= minimum_stock_quantity)::int AS low_stock_count,
              COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock_count
       FROM products`,
    ),
    pool.query(
      `SELECT id, product_name, sku, category, current_stock,
              minimum_stock_quantity AS minimum_stock, warehouse_location
       FROM products
       WHERE current_stock <= minimum_stock_quantity
       ORDER BY (minimum_stock_quantity - current_stock) DESC, current_stock ASC, id ASC`,
    ),
    pool.query(
      `SELECT id, product_name, sku, category, current_stock,
              minimum_stock_quantity AS minimum_stock, warehouse_location
       FROM products
       WHERE current_stock = 0
       ORDER BY id ASC`,
    ),
  ]);

  const row = metrics.rows[0];
  return {
    totalProducts: row.total_products,
    totalStockQuantity: row.total_stock_quantity,
    lowStockCount: row.low_stock_count,
    outOfStockCount: row.out_of_stock_count,
    lowStockProducts: lowStock.rows,
    outOfStockProducts: outOfStock.rows,
  };
}

export async function getChallans() {
  const [counts, recent] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
              COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
       FROM sales_challans`,
    ),
    pool.query(
      `SELECT sc.challan_number, c.customer_name, c.business_name,
              sc.total_quantity, sc.status, u.name AS created_by,
              sc.created_at
       FROM sales_challans sc
       JOIN customers c ON c.id = sc.customer_id
       JOIN users u ON u.id = sc.created_by
       ORDER BY sc.created_at DESC, sc.id DESC
       LIMIT $1`,
      [recentLimit],
    ),
  ]);

  const count = counts.rows[0];
  return {
    total: count.total,
    draft: count.draft,
    confirmed: count.confirmed,
    cancelled: count.cancelled,
    recentChallans: recent.rows,
  };
}

export async function getFollowUps() {
  const result = await pool.query(
    `SELECT f.id, f.follow_up_date, f.note,
            c.customer_name, c.business_name,
            u.name AS created_by
     FROM follow_ups f
     JOIN customers c ON c.id = f.customer_id
     JOIN users u ON u.id = f.created_by
     WHERE f.follow_up_date IS NOT NULL
     ORDER BY f.follow_up_date ASC, f.id ASC
     LIMIT $1`,
    [recentLimit],
  );
  return result.rows;
}

export async function getActivity(from?: string, to?: string) {
  const values: string[] = [];
  const filters: string[] = [];

  if (from) {
    values.push(from);
    filters.push(`activity_date >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    filters.push(`activity_date < ($${values.length}::date + INTERVAL '1 day')`);
  }
  const dateFilter = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT activity_type, description, activity_date, product_id, product_name,
            challan_number, customer_name, created_by
     FROM (
       SELECT 'STOCK_MOVEMENT' AS activity_type,
              sm.movement_type || ' ' || sm.quantity_changed || ' unit(s): ' ||
                COALESCE(sm.reason, 'Stock movement') AS description,
              sm.created_at AS activity_date,
              p.id AS product_id, p.product_name, NULL::text AS challan_number,
              NULL::text AS customer_name, u.name AS created_by
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN users u ON u.id = sm.created_by
       UNION ALL
       SELECT 'CHALLAN' AS activity_type,
              'Challan ' || sc.challan_number || ' created (' || sc.status || ')' AS description,
              sc.created_at AS activity_date,
              NULL::int AS product_id, NULL::text AS product_name,
              sc.challan_number, c.customer_name, u.name AS created_by
       FROM sales_challans sc
       JOIN customers c ON c.id = sc.customer_id
       JOIN users u ON u.id = sc.created_by
       UNION ALL
       SELECT 'FOLLOW_UP' AS activity_type,
              'Follow-up: ' || COALESCE(f.note, 'No note') AS description,
              f.created_at AS activity_date,
              NULL::int AS product_id, NULL::text AS product_name,
              NULL::text AS challan_number, c.customer_name, u.name AS created_by
       FROM follow_ups f
       JOIN customers c ON c.id = f.customer_id
       JOIN users u ON u.id = f.created_by
     ) activity
     ${dateFilter}
     ORDER BY activity_date DESC
     LIMIT $${values.length + 1}`,
    [...values, recentLimit * 2],
  );
  return result.rows;
}
