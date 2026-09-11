import { apiRequest } from './client';

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Page<T> = { rows: T[]; pagination: Pagination };
export type Product = { id: number; product_name: string; sku: string; category: string; unit_price: number; current_stock: number; minimum_stock_quantity: number; warehouse_location: string; updated_at?: string };
export type Movement = { id: number; product_id: number; product_name: string; sku: string; quantity_changed: number; movement_type: 'IN' | 'OUT'; reason: string; created_by_name: string; created_at: string };
export type Customer = { id: number; customer_name: string; mobile: string; email?: string | null; business_name: string; gst_number?: string; customer_type: string; address: string; status: string; follow_up_date?: string; notes?: string | null };
export type FollowUp = { id: number; follow_up_date: string; note: string; created_by_name?: string };
export type Challan = { id: number; challan_number: string; customer_id: number; business_name: string; customer_name: string; total_quantity: number; status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'; created_by_name: string; created_at: string };
export type ChallanItem = { productId: number; quantity: number };
export type ChallanPayload = { customerId: number; items: ChallanItem[] };
export type ManagedUser = { id: number; name: string; email: string; role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS' };
export type DashboardSummary = { customers: { total: number; active: number }; products: { total: number; totalStockQuantity: number; lowStock: number; outOfStock: number }; challans: { draft: number; confirmed: number } };
export type LowStockProduct = Pick<Product, 'id' | 'product_name' | 'sku' | 'current_stock' | 'warehouse_location'> & { minimum_stock: number };
export type InventoryDashboard = { totalProducts: number; totalStockQuantity: number; lowStockCount: number; outOfStockCount: number; lowStockProducts: LowStockProduct[] };
export type Activity = { activity_date: string; description: string; created_by: string };
export type DashboardData = { summary: DashboardSummary; inventory: InventoryDashboard; challans: unknown; activity: Activity[] };

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))}` : '';
};

export const erpApi = {
  dashboard: {
    summary: () => apiRequest<DashboardSummary>('/dashboard/summary'),
    inventory: () => apiRequest<InventoryDashboard>('/dashboard/inventory'),
    challans: () => apiRequest<unknown>('/dashboard/challans'),
    activity: (from?: string, to?: string) => apiRequest<Activity[]>(`/dashboard/activity${query({ from, to })}`),
  },
  products: {
    list: (params: Record<string, string | number | boolean | undefined>) => apiRequest<Page<Product>>(`/products${query(params)}`),
    get: (id: number) => apiRequest<Product>(`/products/${id}`),
    create: (body: Partial<Product>) => apiRequest<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Product>) => apiRequest<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    stock: (id: number, type: 'in' | 'out', body: { quantity: number; reason: string }) => apiRequest<Product>(`/products/${id}/stock/${type}`, { method: 'POST', body: JSON.stringify(body) }),
  },
  movements: (params: Record<string, string | number | undefined> = {}) => apiRequest<Page<Movement>>(`/stock-movements${query(params)}`),
  customers: {
    list: (params: Record<string, string | number | undefined>) => apiRequest<Page<Customer>>(`/customers${query(params)}`),
    create: (body: Partial<Customer>) => apiRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
    followUps: (id: number) => apiRequest<FollowUp[]>(`/customers/${id}/follow-ups`),
    addFollowUp: (id: number, body: { follow_up_date: string; note: string }) => apiRequest<FollowUp>(`/customers/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(body) }),
  },
  users: {
    list: () => apiRequest<ManagedUser[]>('/users'),
    create: (body: { name: string; email: string; password: string; role: ManagedUser['role'] }) => apiRequest<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  },
  challans: {
    list: (params: Record<string, string | number | undefined>) => apiRequest<Page<Challan>>(`/challans${query(params)}`),
    get: (id: number) => apiRequest<Challan>(`/challans/${id}`),
    create: (body: ChallanPayload) => apiRequest<Challan>('/challans', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: ChallanPayload) => apiRequest<Challan>(`/challans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    confirm: (id: number) => apiRequest<Challan>(`/challans/${id}/confirm`, { method: 'POST' }),
    cancel: (id: number) => apiRequest<Challan>(`/challans/${id}/cancel`, { method: 'POST' }),
  },
};
