const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
let token: string | null = localStorage.getItem('fundsroom_token');
let onUnauthorized: (() => void) | null = null;
export class ApiError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status; } }
export function setApiToken(nextToken: string | null): void { token = nextToken; if (nextToken) localStorage.setItem('fundsroom_token', nextToken); else localStorage.removeItem('fundsroom_token'); }
export function getApiToken(): string | null { return token; }
export function setUnauthorizedHandler(handler: (() => void) | null): void { onUnauthorized = handler; }
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers); headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null) as { message?: string; data?: T } | null;
  if (!response.ok) { if (response.status === 401) onUnauthorized?.(); throw new ApiError(body?.message ?? 'Request failed', response.status); }
  return (body?.data ?? body) as T;
}
