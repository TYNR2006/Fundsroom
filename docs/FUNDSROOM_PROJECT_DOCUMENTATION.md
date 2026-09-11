# Fundsroom ERP & CRM Operations Portal

## Company handoff document

**Status:** Development complete; deployment intentionally parked  
**Repository:** `TYNR2006/Fundsroom`  
**Application type:** Internal wholesale and distribution operations portal  
**Last verified:** 11 September 2026

---

## 1. Executive summary

Fundsroom is a web-based operations portal designed to give a wholesale or
distribution business one reliable place to manage its day-to-day work.

The system brings together:

- customer and follow-up management;
- product catalogue management;
- inventory and stock movement control;
- sales challan preparation and processing;
- operational dashboards;
- role-based access for different teams; and
- clear success and error feedback through the interface.

The application uses real database records and real API responses. It does not
depend on demo data in the user interface, and inventory changes are protected
by database transactions so a failed operation does not leave partial updates.

The current release is ready for a controlled deployment process. Hosting has
been prepared but deliberately not activated yet, so the company can review
the environment, credentials, database, and release owner before going live.

## 2. What problem the system solves

Without a shared operations system, teams often rely on separate spreadsheets,
messages, and manual updates. That makes it difficult to answer simple but
important questions:

- Which products are available right now?
- Which items are close to their minimum stock level?
- Which customer follow-ups are due?
- Which challans are still drafts?
- When did stock change, and why?
- Who is allowed to create users, adjust stock, or cancel a confirmed challan?

Fundsroom gives the team a consistent workflow and a shared source of truth.
The dashboard provides a quick operational view, while each module retains the
detail needed for day-to-day work.

## 3. Main capabilities

### Dashboard

The dashboard gives an at-a-glance view of:

- total customers and active customers;
- product count and total stock quantity;
- low-stock and out-of-stock counts;
- open and confirmed challans;
- inventory items needing attention; and
- recent stock, challan, and follow-up activity.

### Customers and follow-ups

Teams can create and search customers, maintain customer details, and record
follow-ups with dates, notes, and ownership information. Follow-up activity is
visible in the dashboard activity feed.

### Products

Administrators can create and update products with:

- product name;
- SKU;
- category;
- unit price;
- current stock;
- minimum stock quantity; and
- warehouse location.

The system validates product information and handles duplicate SKU errors
through the API.

### Inventory

Authorized users can record stock coming in or going out. Every movement
records the quantity, direction, reason, product, and responsible user.

Stock-out operations cannot reduce stock below zero. The system checks and
updates inventory inside a PostgreSQL transaction, which protects the data
when an operation fails.

### Sales challans

Authorized sales users can:

1. select a customer;
2. add one or more products and quantities;
3. save a challan as a draft;
4. review the product and price snapshots;
5. confirm the challan when it is ready; or
6. cancel it when appropriate.

Creating or editing a draft does not change inventory. Confirmation validates
all required stock first, then reduces stock and records `OUT` movements in
the same transaction.

Draft cancellation does not affect stock. A confirmed challan can only be
cancelled by an administrator; cancellation restores the exact quantities and
records matching `IN` movements. This preserves an auditable movement history.

### User management

Administrators can create internal users and assign one of the supported roles.
Passwords are stored as bcrypt hashes and are never returned by the API.
Public self-registration is not enabled.

## 4. Roles and responsibilities

| Role | Typical responsibility | Main access |
|---|---|---|
| `ADMIN` | System and operational oversight | User management, product management, stock, challans, dashboard, confirmed-challan cancellation |
| `SALES` | Customer and order operations | Customers, follow-ups, challan creation, confirmation, and permitted cancellation |
| `WAREHOUSE` | Physical stock operations | Product visibility, stock-in, stock-out, and movement history |
| `ACCOUNTS` | Operational visibility and review | Authenticated read access to the areas permitted by the application |

The backend enforces authorization. Hiding a navigation item in the frontend
is not the security boundary; every protected route also checks the user's
JWT and role.

## 5. Typical business workflow

### New customer and follow-up

1. A permitted user opens **Customers**.
2. The user records the customer's business and contact details.
3. A follow-up is added with the next action and due date.
4. The dashboard activity view provides visibility into recent follow-up work.

### New product and stock

1. An administrator creates the product and sets its minimum stock quantity.
2. An authorized warehouse user records received stock as **Stock in**.
3. The system creates an `IN` movement and updates the product balance.
4. When stock is dispatched, the user records **Stock out** with a reason.
5. The system blocks the operation if the requested quantity is unavailable.

### Sales challan

1. A sales user creates a draft challan for a customer.
2. Products and quantities are selected.
3. The draft is reviewed without changing stock.
4. The challan is confirmed when the dispatch is approved.
5. Stock is reduced and `OUT` movements are recorded atomically.
6. If an administrator later cancels a confirmed challan, the exact stock is
   restored and the compensating `IN` movements are recorded.

## 6. Technical architecture

### Frontend

- React
- TypeScript
- Vite
- React Router
- Lucide icons
- Centralized API client
- JWT-backed authentication context
- Global toast notification context

The frontend is responsive and includes loading, empty, error, and mobile
states. It communicates with the backend API rather than writing directly to
the database.

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL through `pg`
- JWT authentication
- bcrypt password hashing
- Zod request validation
- Helmet security headers
- CORS configuration

The backend uses direct SQL and PostgreSQL transactions. No ORM is used.

### Database

The database stores roles, users, customers, follow-ups, products, stock
movements, sales challans, and challan items. Foreign keys, constraints,
indexes, row locks, and transactions are used where they protect data
integrity.

## 7. Local setup for a new developer

### Prerequisites

- Node.js 22 or a compatible current LTS release
- npm
- PostgreSQL
- Git

### Backend

```powershell
cd C:\Users\Chandu\Fundsroom\backend
npm install
Copy-Item .env.example .env
npm run build
npm run dev
```

Set the database and JWT values in `backend\.env`. Never commit this file.

### Frontend

```powershell
cd C:\Users\Chandu\Fundsroom\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend defaults to:

```text
http://localhost:5000/api
```

The local application is normally opened at:

```text
http://localhost:5173
```

## 8. API and data safeguards

The following safeguards are part of the current implementation:

- protected API routes require a valid JWT;
- role-restricted operations are checked in the backend;
- request payloads are validated with Zod;
- passwords are hashed and excluded from responses;
- stock cannot become negative;
- stock and challan confirmation use transactions;
- confirmed challan cancellation restores exact item quantities;
- duplicate products in one challan are rejected;
- duplicate user emails are rejected;
- dashboard endpoints are read-only;
- API errors are surfaced as professional UI messages and toasts.

## 9. Verification completed

The following checks have passed in the local project:

- backend TypeScript production build;
- frontend TypeScript and Vite production build;
- backend health endpoint;
- frontend HTTP response;
- administrator login;
- redirect from login to dashboard;
- dashboard data loading;
- admin navigation visibility;
- frontend source scan with zero `any` matches;
- final browser smoke check after the dashboard placeholder cleanup;
- Git working tree clean after the release commits.

The latest release-related commits are:

```text
be91ae0  fix: remove dashboard placeholder markers
3498f8e  chore: prepare render and vercel deployment
```

## 10. Deployment status

Deployment is **parked by decision**. The repository contains:

- `render.yaml` for the backend service;
- `frontend/vercel.json` for client-side route fallback; and
- documented production environment variables.

Before a production launch, the release owner should:

1. provision the managed PostgreSQL database;
2. apply the approved schema and seed process;
3. create a strong production JWT secret;
4. change all development credentials;
5. deploy the backend and verify `/api/health`;
6. deploy the frontend with the production API URL;
7. set the backend CORS origin to the final frontend URL;
8. test the critical workflows using non-development credentials; and
9. record the production URLs and ownership contacts securely.

No production secrets, database passwords, or personal credentials belong in
this document or in the Git repository.

## 11. Recommended handover checklist

- [ ] Product owner has reviewed the business workflows.
- [ ] Finance/operations has reviewed challan and stock behavior.
- [ ] Admin owner has been identified.
- [ ] Production database backup and recovery plan exists.
- [ ] Production credentials are stored in a password manager.
- [ ] Development credentials have been rotated.
- [ ] Production frontend and backend URLs are documented internally.
- [ ] A first-day support contact has been assigned.
- [ ] A release rollback plan has been agreed.

## 12. Closing note

Fundsroom is intended to make everyday operational work calmer and more
traceable: teams can see what is happening, act within their responsibilities,
and understand how each inventory or challan decision affected the business.

The implementation is complete for the current agreed scope. The next stage is
not additional feature development; it is controlled company review followed
by a properly managed production release.
