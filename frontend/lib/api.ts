// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

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
}

export interface TransactionListResponse {
  transactions: Transaction[];
  page: number;
  limit: number;
}

export interface ReviewQueueResponse {
  transactions: Transaction[];
  count: number;
}
