"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { EditNotesDialog } from "@/components/transactions/edit-notes-dialog";
import { ExportDialog } from "@/components/transactions/export-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionDetailSheet } from "@/components/transactions/transaction-detail-sheet";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { EditCategoryDialog } from "@/components/transactions/edit-category-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, Transaction } from "@/lib/api";
import { ActiveFilters } from "@/components/transactions/transaction-filters";

function TransactionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const initialFilters: ActiveFilters = {
    type:     searchParams.get("type")     ?? undefined,
    source:   searchParams.get("source")   ?? undefined,
    category: searchParams.get("category") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo:   searchParams.get("dateTo")   ?? undefined,
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(
    searchParams.get("txn") ?? null
  );
  const [search, setSearch] = useState(initialSearch);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(initialFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.transactions.list({
          page,
          limit,
          type: activeFilters.type as 'income' | 'expense' | undefined,
          source: activeFilters.source as 'sms' | 'email' | 'bank_statement' | 'manual' | undefined,
          category: activeFilters.category,
          search: search || undefined,
          dateFrom: activeFilters.dateFrom,
          dateTo: activeFilters.dateTo,
        });
        setTransactions(response.transactions);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeFilters, search, refreshKey, page]);

  const fetchTransactions = () => setRefreshKey((k) => k + 1);

  const isInternalNav = useRef(false);

  const syncURL = useCallback(
    (nextSearch: string, nextFilters: ActiveFilters, nextPage: number, method: "push" | "replace") => {
      const params = new URLSearchParams();
      if (nextSearch)            params.set("search",   nextSearch);
      if (nextFilters.type)      params.set("type",     nextFilters.type);
      if (nextFilters.source)    params.set("source",   nextFilters.source);
      if (nextFilters.category)  params.set("category", nextFilters.category);
      if (nextFilters.dateFrom)  params.set("dateFrom", nextFilters.dateFrom);
      if (nextFilters.dateTo)    params.set("dateTo",   nextFilters.dateTo);
      if (nextPage > 1)          params.set("page",     String(nextPage));
      const currentTxn = searchParams.get("txn");
      if (currentTxn)            params.set("txn",      currentTxn);
      const query = params.toString();
      const url = query ? `?${query}` : "/transactions";
      isInternalNav.current = true;
      if (method === "push") router.push(url);
      else router.replace(url);
    },
    [router, searchParams]
  );

  const handleTransactionSelect = useCallback(
    (id: string | null) => {
      setSelectedTransactionId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("txn", id);
      else params.delete("txn");
      isInternalNav.current = true;
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (isInternalNav.current) {
      isInternalNav.current = false;
      return;
    }
    // URL changed externally (browser back/forward) — re-sync state
    setSearch(searchParams.get("search") ?? "");
    setPage(Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1));
    setActiveFilters({
      type:     searchParams.get("type")     ?? undefined,
      source:   searchParams.get("source")   ?? undefined,
      category: searchParams.get("category") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo:   searchParams.get("dateTo")   ?? undefined,
    });
    setSelectedTransactionId(searchParams.get("txn") ?? null);
  }, [searchParams]);

  const handleFilterChange = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    setPage(1);
    syncURL(search, filters, 1, "push");
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    syncURL(value, activeFilters, 1, "replace");
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    syncURL(search, activeFilters, nextPage, "replace");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      sms: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      email: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      bank_statement: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      manual: 'bg-muted text-muted-foreground',
    };
    return colors[source] || colors.manual;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your transactions
          </p>
        </div>
        <div className="flex gap-3">
          <ExportDialog>
            <Button variant="outline">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </ExportDialog>
          <AddTransactionDialog onSuccess={fetchTransactions}>
            <Button>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Transaction</span>
            </Button>
          </AddTransactionDialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <TransactionFilters onFilterChange={handleFilterChange} initialFilters={initialFilters} />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found. Create your first transaction or send an SMS webhook!
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTransactionSelect(tx.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{tx.description}</div>
                        {tx.merchant && (
                          <div className="text-xs text-muted-foreground mt-0.5">{tx.merchant}</div>
                        )}
                      </div>
                      <span
                        className={`font-semibold text-sm shrink-0 ${
                          tx.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(tx.transactionDate)}</span>
                      <Badge className={getSourceBadge(tx.source)}>{tx.source}</Badge>
                      {tx.category?.name && <span className="text-foreground">{tx.category.name}</span>}
                      {tx.aiConfidence ? (
                        <Badge
                          className={
                            tx.aiConfidence >= 0.9
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {Math.round(tx.aiConfidence * 100)}%
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <EditNotesDialog transactionId={tx.id} currentNotes={tx.notes} onSuccess={fetchTransactions} />
                      <EditCategoryDialog
                        transactionId={tx.id}
                        transactionType={tx.type as "income" | "expense"}
                        currentCategoryId={tx.categoryId}
                        currentCategoryName={tx.category?.name}
                        onSuccess={fetchTransactions}
                      />
                      <DeleteTransactionDialog transactionId={tx.id} onSuccess={fetchTransactions} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Source
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Confidence
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleTransactionSelect(tx.id)}
                      >
                        <td className="py-3 px-4 max-w-xs">
                          <div>
                            <div className="font-medium text-sm">{tx.description}</div>
                            {tx.merchant && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {tx.merchant}
                              </div>
                            )}
                            {tx.notes && (
                              <div
                                className="text-xs text-muted-foreground italic mt-0.5 truncate"
                                title={tx.notes}
                              >
                                {tx.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              tx.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}₹
                            {tx.amount.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">
                            {tx.category?.name || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getSourceBadge(tx.source)}>
                            {tx.source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {tx.aiConfidence ? (
                            <Badge
                              className={
                                tx.aiConfidence >= 0.9
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }
                            >
                              {Math.round(tx.aiConfidence * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <EditNotesDialog
                              transactionId={tx.id}
                              currentNotes={tx.notes}
                              onSuccess={fetchTransactions}
                            />
                            <EditCategoryDialog
                              transactionId={tx.id}
                              transactionType={tx.type as "income" | "expense"}
                              currentCategoryId={tx.categoryId}
                              currentCategoryName={tx.category?.name}
                              onSuccess={fetchTransactions}
                            />
                            <DeleteTransactionDialog
                              transactionId={tx.id}
                              onSuccess={fetchTransactions}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {page}/{totalPages} <span className="hidden sm:inline">— {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={item === page ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handlePageChange(item as number)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <TransactionDetailSheet
        transactionId={selectedTransactionId}
        onClose={() => handleTransactionSelect(null)}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageContent />
    </Suspense>
  );
}
