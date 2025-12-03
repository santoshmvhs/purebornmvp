import axios from 'axios';

// Determine API URL based on environment
// This function is called at runtime to ensure window is available
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If we're in the browser (client-side), check the hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not localhost, we're in production - use production backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://purebornmvp.onrender.com';
    }
  }
  
  // Default to localhost for local development
  return 'http://localhost:9000';
};

// Create axios instance with dynamic baseURL
// We'll set the baseURL dynamically in the request interceptor
export const api = axios.create({
  baseURL: '', // Will be set dynamically
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies (httpOnly cookies) with requests
});

// Request interceptor
// Note: With Supabase Auth, we use Supabase tokens
api.interceptors.request.use(
  async (config) => {
    // Set baseURL dynamically at request time (runtime)
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl();
    }
    
    // Get Supabase session token
    if (typeof window !== 'undefined') {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
    
    // withCredentials ensures cookies are sent with cross-origin requests
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token from localStorage (if exists) and redirect to login
      // Note: httpOnly cookies are cleared by the backend /logout endpoint
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Suppress console errors for expected 404s on day-counters
    if (error.response?.status === 404 && error.config?.url?.includes('/day-counters/')) {
      // Silently handle - this is expected when no counter exists for a date
      // Still reject the promise so components can handle it
    } else if (error.response) {
      // Only log non-404 errors or errors not related to day-counters
      // (Axios will still log, but we can minimize noise)
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await api.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  register: async (username: string, password: string, role: string) => {
    const response = await api.post('/auth/register', {
      username,
      password,
      role,
    });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number; active_only?: boolean }) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/products', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

// Product Variants API
export const productVariantsApi = {
  getAll: async (params?: { product_id?: string; active_only?: boolean }) => {
    const response = await api.get('/product-variants', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/product-variants/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/product-variants', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/product-variants/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/product-variants/${id}`);
    return response.data;
  },
};

// Sales API
export const salesApi = {
  getAll: async (params?: { start_date?: string; end_date?: string; page?: number; limit?: number }) => {
    const response = await api.get('/sales', { params });
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/sales', data);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getDailySales: async (date?: string) => {
    const response = await api.get('/reports/daily', {
      params: { report_date: date },
    });
    return response.data;
  },

  getMonthlySales: async (year?: number, month?: number) => {
    const response = await api.get('/reports/monthly', {
      params: { year, month },
    });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  update: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
};

// Vendors API
export const oilCakeSalesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    customer_id?: string;
    cake_category?: string;
    is_paid?: boolean;
  }) => {
    const response = await api.get('/oil-cake-sales', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/oil-cake-sales/${id}`);
    return response.data;
  },
  create: async (data: {
    date: string;
    customer_id?: string;
    cake_category: string;
    cake: string;
    quantity: number;
    price_per_kg: number;
    is_paid?: boolean;
    remarks?: string;
  }) => {
    const response = await api.post('/oil-cake-sales', data);
    return response.data;
  },
  update: async (id: string, data: {
    date?: string;
    customer_id?: string;
    cake_category?: string;
    cake?: string;
    quantity?: number;
    price_per_kg?: number;
    is_paid?: boolean;
    remarks?: string;
  }) => {
    const response = await api.put(`/oil-cake-sales/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/oil-cake-sales/${id}`);
  },
};

export const vendorsApi = {
  getAll: async (params?: { search?: string; active_only?: boolean }) => {
    const response = await api.get('/vendors', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/vendors', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/vendors/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },
};

// Raw Materials API
export const rawMaterialsApi = {
  getAll: async (params?: { search?: string; active_only?: boolean }) => {
    const response = await api.get('/raw-materials', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/raw-materials/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/raw-materials', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/raw-materials/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/raw-materials/${id}`);
    return response.data;
  },
};

// Purchases API
export const purchasesApi = {
  getAll: async (params?: {
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/purchases', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/purchases/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/purchases', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/purchases/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/purchases/${id}`);
    return response.data;
  },
};

// Day Counters API
export const dayCountersApi = {
  getAll: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get('/day-counters', { params });
    return response.data;
  },
  
  getByDate: async (date: string) => {
    const response = await api.get(`/day-counters/${date}`, {
      validateStatus: (status) => status === 200 || status === 404, // Don't throw on 404
    });
    if (response.status === 404) {
      // Return null to indicate no counter exists
      return null;
    }
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/day-counters', data);
    return response.data;
  },
  
  update: async (date: string, data: any) => {
    const response = await api.put(`/day-counters/${date}`, data);
    return response.data;
  },
  
  delete: async (date: string) => {
    const response = await api.delete(`/day-counters/${date}`);
    return response.data;
  },
};

export const expensesApi = {
  getAll: async (params?: { 
    start_date?: string; 
    end_date?: string; 
    category_id?: string;
    vendor_id?: string;
    page?: number; 
    limit?: number 
  }) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/expenses', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
  
  // Expense Categories
  getCategories: async () => {
    try {
      const response = await api.get('/expenses/categories', {
        validateStatus: (status) => status === 200 || status === 422, // Don't throw on 422
      });
      if (response.status === 422) {
        // Return empty array if 422 (validation error)
        return [];
      }
      return response.data || [];
    } catch (error: any) {
      // Return empty array on any error
      return [];
    }
  },
  
  createCategory: async (data: { name: string }) => {
    const response = await api.post('/expenses/categories', data);
    return response.data;
  },
};

export const manufacturingApi = {
  getAll: async (params?: { 
    start_date?: string; 
    end_date?: string; 
    page?: number; 
    limit?: number 
  }) => {
    const response = await api.get('/manufacturing', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/manufacturing/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/manufacturing', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/manufacturing/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/manufacturing/${id}`);
    return response.data;
  },
};

// Views API (for inventory stock, balances, etc.)
export const viewsApi = {
  getRawMaterialStock: async () => {
    const response = await api.get('/views/inventory/raw-materials');
    return response.data;
  },
  
  getProductVariantStock: async () => {
    const response = await api.get('/views/inventory/product-variants');
    return response.data;
  },
  
  getVendorBalances: async () => {
    const response = await api.get('/views/balances/vendors');
    return response.data;
  },
  
  getCustomerBalances: async () => {
    const response = await api.get('/views/balances/customers');
    return response.data;
  },
};

// Dashboard API (for KPI calculations)
export const dashboardApi = {
  getKPIs: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get('/dashboard/kpis', { params });
    return response.data;
  },
};

