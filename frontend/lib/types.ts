// Core domain types
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string | null;
  categoryName?: string;
  source: TransactionSource;
  type: TransactionType;
  merchant?: string;
  aiConfidence?: number;
  isReviewed: boolean;
  tags?: string[];
  rawData?: string;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionSource {
  SMS = "sms",
  EMAIL = "email",
  BANK_STATEMENT = "bank_statement",
  MANUAL = "manual",
}

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  type: TransactionType;
  spendingLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: string;
  type: TransactionSource;
  name: string;
  status: SourceStatus;
  lastSyncAt?: string;
  config?: Record<string, any>;
  isActive: boolean;
}

export enum SourceStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  SYNCING = "syncing",
}

// Filter and pagination types
export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
  sources?: TransactionSource[];
  types?: TransactionType[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  isReviewed?: boolean;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Analytics types
export interface SpendingTrend {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeChange: number; // percentage
  expenseChange: number; // percentage
  pendingReviewCount: number;
  transactionCount: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface TransactionFormData {
  amount: number;
  description: string;
  date: string;
  categoryId: string | null;
  type: TransactionType;
  merchant?: string;
  tags?: string[];
}

export interface CategoryFormData {
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  type: TransactionType;
  spendingLimit?: number;
}
