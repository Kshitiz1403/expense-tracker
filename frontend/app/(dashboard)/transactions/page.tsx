"use client";

import { useEffect, useState } from "react";
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
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

  const handleFilterChange = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
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
      sms: 'bg-blue-100 text-blue-700',
      email: 'bg-purple-100 text-purple-700',
      bank_statement: 'bg-green-100 text-green-700',
      manual: 'bg-gray-100 text-gray-700',
    };
    return colors[source] || colors.manual;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-gray-600 mt-1">
            View and manage all your transactions
          </p>
        </div>
        <div className="flex gap-3">
          <ExportDialog>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </ExportDialog>
          <AddTransactionDialog onSuccess={fetchTransactions}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </AddTransactionDialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <TransactionFilters onFilterChange={handleFilterChange} />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No transactions found. Create your first transaction or send an SMS webhook!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Source
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Confidence
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransactionId(tx.id)}
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <div>
                          <div className="font-medium text-sm">{tx.description}</div>
                          {tx.merchant && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {tx.merchant}
                            </div>
                          )}
                          {tx.notes && (
                            <div
                              className="text-xs text-gray-400 italic mt-0.5 truncate"
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
                      <td className="py-3 px-4 text-sm text-gray-600">
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
                          <span className="text-gray-400 text-sm">-</span>
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
          )}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                    ) : (
                      <Button
                        key={item}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
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
        onClose={() => setSelectedTransactionId(null)}
      />
    </div>
  );
}
