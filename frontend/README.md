# Fundsroom ERP Frontend

React + TypeScript frontend foundation for the Fundsroom ERP portal.

## Setup

```powershell
cd C:\Users\Chandu\Fundsroom\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend uses `VITE_API_BASE_URL` to connect to the backend. The default is `http://localhost:5000/api`.

Phase 1 and Phase 2 currently provide the Vite foundation, typed API client, centralized JWT handling, and `AuthContext`. Login, protected routes, and application screens are added in subsequent phases.
