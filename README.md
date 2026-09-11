# Fundsroom ERP

Internal Mini ERP + CRM Operations Portal for a wholesale/distribution company.

The backend uses Node.js, TypeScript, Express, PostgreSQL through `pg`, JWT, bcrypt, dotenv, and Zod. No ORM is used.

For the human-readable company handoff, see
[`docs/FUNDSROOM_PROJECT_DOCUMENTATION.md`](docs/FUNDSROOM_PROJECT_DOCUMENTATION.md).

## Production deployment

The repository includes a Render blueprint at `render.yaml` for the backend and a
Vercel SPA rewrite at `frontend/vercel.json`.

### 1. Provision PostgreSQL

Create a managed PostgreSQL database on Render or another provider. Apply the
SQL in `database/schema.sql` followed by the seed/admin SQL documented in the
database setup instructions. Keep the database credentials private.

### 2. Deploy the backend on Render

Create the service from this repository using `render.yaml`, or configure a
Node web service manually:

```text
Root directory: backend
Build command: npm ci && npm run build
Start command: npm start
Health check: /api/health
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, and `CORS_ORIGIN`. `CORS_ORIGIN` should be the
final Vercel URL, without a trailing slash. Use a newly generated production
`JWT_SECRET` and change the development admin password before launch.

### 3. Deploy the frontend on Vercel

Import the repository and set the project root to `frontend`. Vercel detects
Vite automatically. Define:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
```

The included `frontend/vercel.json` keeps React Router routes working on direct
loads and refreshes.

### 4. Verify the deployed services

Check the backend health endpoint, then sign in through the Vercel URL and
verify dashboard loading, role navigation, products, inventory, customers,
follow-ups, challans, and toast notifications. Do not use the local
development credentials in production.

## Products and inventory APIs

All product and inventory endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/products` | All authenticated roles |
| GET | `/api/products/:id` | All authenticated roles |
| POST | `/api/products` | ADMIN |
| PUT | `/api/products/:id` | ADMIN |
| POST | `/api/products/:id/stock/in` | ADMIN, WAREHOUSE |
| POST | `/api/products/:id/stock/out` | ADMIN, WAREHOUSE |
| GET | `/api/stock-movements` | All authenticated roles |
| GET | `/api/products/:id/stock-movements` | All authenticated roles |

Product listing supports `search`, `category`, `lowStock=true`, `page`, and `limit`.
Stock operations require a positive integer `quantity` and a non-empty `reason`.
Stock changes lock the product row and update `products` and `stock_movements` in one PostgreSQL transaction. Failed stock removals leave both unchanged.

## Sales challan draft APIs

All challan endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/challans` | All authenticated roles |
| GET | `/api/challans/:id` | All authenticated roles |
| POST | `/api/challans` | ADMIN, SALES |
| PUT | `/api/challans/:id` | ADMIN, SALES |

Create and update requests use `customerId` and an `items` array containing `productId` and positive integer `quantity`. Duplicate products in one challan are rejected. The backend loads current product data and stores name, SKU, unit-price, quantity, and line-total snapshots in `sales_challan_items`.

New and edited challans remain `DRAFT`; draft operations do not change product stock or create stock movements. Creation and updates use PostgreSQL transactions so a challan cannot be left with partial items.

## Challan confirmation

`POST /api/challans/:id/confirm` is available to `ADMIN` and `SALES`. It locks the challan and all referenced product rows, validates every item before making changes, reduces stock, records `OUT` movements, and marks the challan `CONFIRMED` in one transaction. Any insufficient-stock or other failure rolls back all changes; confirmed and cancelled challans cannot be confirmed again.

`POST /api/challans/:id/cancel` is available to `ADMIN` and `SALES` for draft challans. Only `ADMIN` can cancel a confirmed challan because that operation restores inventory. Draft cancellation changes only the status. Confirmed cancellation locks the challan and affected products, restores each exact item quantity, records matching `IN` movements, and marks the challan `CANCELLED` atomically. Cancelled challans cannot be cancelled, confirmed, or edited.

## Dashboard APIs

All dashboard endpoints require a JWT in the `Authorization` header and are read-only. They are available to all authenticated internal roles; the response is limited to operational customer, inventory, challan, follow-up, and activity information.

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/dashboard/summary` | All authenticated roles |
| GET | `/api/dashboard/inventory` | All authenticated roles |
| GET | `/api/dashboard/challans` | All authenticated roles |
| GET | `/api/dashboard/activity` | All authenticated roles |

The summary reports customer totals by `LEAD`, `ACTIVE`, and `INACTIVE`, product totals and stock quantities, challan totals by `DRAFT`, `CONFIRMED`, and `CANCELLED`, and upcoming/overdue follow-ups. Low stock is defined as `current_stock <= minimum_stock`; out of stock is `current_stock = 0`.

The inventory endpoint includes low-stock products ordered by largest threshold gap and a separate out-of-stock list. The challan endpoint includes the latest ten challans. Activity combines recent stock movements, challan creation, and follow-up activity, limited to twenty records. Activity accepts optional parameterized `from` and `to` filters in `YYYY-MM-DD` format.

Dashboard values are calculated with PostgreSQL `COUNT`, `SUM`, filtered aggregates, joins, and bounded ordered queries. No dashboard endpoint inserts, updates, or deletes data, and no dashboard-specific tables are used.

## Admin user management

GET /api/users and POST /api/users require an authenticated ADMIN. POST accepts { name, email, password, role }; passwords are bcrypt-hashed and duplicate emails return 409. User creation does not alter operational created_by relationships or history.
