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
