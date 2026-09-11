# Fundsroom ERP

Internal Mini ERP + CRM Operations Portal for a wholesale/distribution company.

The backend uses Node.js, TypeScript, Express, PostgreSQL through `pg`, JWT, bcrypt, dotenv, and Zod. No ORM is used.

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
