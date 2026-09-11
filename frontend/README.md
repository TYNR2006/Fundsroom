# Fundsroom ERP frontend

Responsive React + TypeScript ERP workspace for authentication, product catalogue, inventory, sales challans, customers, and follow-ups. It uses the existing backend API exclusively and does not seed or fabricate business data.

## Run locally

```powershell
cd C:\Users\Chandu\Fundsroom\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` (defaults to `http://localhost:5000/api`). The backend must be running. `npm run build` performs the production type-check and Vite build.

## Access and roles

The UI uses the existing JWT `AuthContext`. Navigation and actions are role-aware: administrators can manage products, warehouse users can perform stock operations, and administrators/sales users can create and process challans. All lists, dashboard metrics, movement history, and follow-ups are loaded from the API with loading, error, empty, and responsive mobile states.
