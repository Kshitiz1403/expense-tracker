// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Lazy import to avoid SSR issues
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// API Client class
class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Clear token and redirect to login
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

  // Auth API
  auth = {
    login: (username: string, password: string) =>
      this.request<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
  };

  // Categories API
  categories = {
    list: () =>
      this.request<Category[]>('/api/categories'),

    getById: (id: string) =>
      this.request<Category>(`/api/categories/${id}`),

    create: (data: CreateCategoryInput) =>
      this.request<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Transactions API
  transactions = {
    list: (params?: TransactionListParams) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.category) query.set('category', params.category);
      if (params?.type) query.set('type', params.type);
      if (params?.source) query.set('source', params.source);
      if (params?.search) query.set('search', params.search);
      if (params?.dateFrom) query.set('date_from', params.dateFrom);
      if (params?.dateTo) query.set('date_to', params.dateTo);

      const queryString = query.toString();
      return this.request<TransactionListResponse>(
        `/api/transactions${queryString ? `?${queryString}` : ''}`
      );
    },

    getById: (id: string) =>
      this.request<Transaction>(`/api/transactions/${id}`),

    create: (data: CreateTransactionInput) =>
      this.request<Transaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateTransactionInput) =>
      this.request<Transaction>(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<{ message: string }>(`/api/transactions/${id}`, {
        method: 'DELETE',
      }),

    reviewQueue: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return this.request<ReviewQueueResponse>(`/api/transactions/review${query}`);
    },

    approve: (id: string) =>
      this.request<Transaction>(`/api/transactions/${id}/approve`, {
        method: 'PUT',
      }),

    export: (params?: ExportTransactionParams): Promise<Blob> => {
      const query = new URLSearchParams();
      if (params?.type) query.set('type', params.type);
      if (params?.source) query.set('source', params.source);
      if (params?.dateFrom) query.set('date_from', params.dateFrom);
      if (params?.dateTo) query.set('date_to', params.dateTo);
      const url = `${this.baseUrl}/api/transactions/export${query.toString() ? `?${query}` : ''}`;
      return fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Export failed: ${r.statusText}`);
        return r.blob();
      });
    },
  };

  // Health API
  health = {
    check: () =>
      this.request<{ status: string; message: string }>('/health'),

    ping: () =>
      this.request<{ message: string }>('/api/ping'),
  };
}

// Export singleton instance
export const api = new APIClient();

// Types
export interface SMSMessage {
  id: string;
  deviceId: string;
  phoneNumber: string;
  message: string;
  receivedAt: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  monthlyBudget?: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transactionDate: string;
  categoryId?: string;
  category?: Category;
  merchant?: string;
  tags?: string[];
  source: 'sms' | 'email' | 'bank_statement' | 'manual';
  sourceId?: string;
  sourceMessage?: SMSMessage;
  aiConfidence?: number;
  aiSuggestedCategoryId?: string;
  aiSuggestedCategory?: Category;
  aiMetadata?: string;
  requiresReview: boolean;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  monthly_budget?: number;
}

export interface CreateTransactionInput {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  transaction_date: string;
  category_id?: string;
  merchant?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  type?: 'income' | 'expense';
  description?: string;
  transaction_date?: string;
  category_id?: string;
  merchant?: string;
  notes?: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'income' | 'expense';
  source?: 'sms' | 'email' | 'bank_statement' | 'manual';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewQueueResponse {
  transactions: Transaction[];
  count: number;
}

export interface ExportTransactionParams {
  type?: 'income' | 'expense';
  source?: 'sms' | 'email' | 'bank_statement' | 'manual';
  dateFrom?: string;
  dateTo?: string;
}
