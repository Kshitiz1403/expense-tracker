"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Receipt,
  PieChart,
  Plus,
  X,
  Search,
  CalendarRange,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  api,
  Trip,
  TripSummary,
  Transaction,
  UpdateTripInput,
} from "@/lib/api";

const FALLBACK_COLORS = [
  "#f97316", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#eab308", "#ef4444", "#22c55e",
  "#6366f1", "#f59e0b",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Edit Trip Dialog ---
function EditTripDialog({
  trip,
  open,
  onOpenChange,
  onUpdated,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: (t: Trip) => void;
}) {
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(trip.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(trip.endDate.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(trip.name);
    setDescription(trip.description ?? "");
    setStartDate(trip.startDate.slice(0, 10));
    setEndDate(trip.endDate.slice(0, 10));
    setError(null);
  }, [trip, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    if (endDate < startDate) { setError("End date must be on or after start date."); return; }
    setLoading(true);
    try {
      const input: UpdateTripInput = {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      };
      if (description.trim()) input.description = description.trim();
      const updated = await api.trips.update(trip.id, input);
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date *</Label>
              <Input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date *</Label>
              <Input id="edit-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Add Transaction to Trip Dialog ---
function AddTransactionDialog({
  tripId,
  open,
  onOpenChange,
  onAdded,
}: {
  tripId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.transactions.list({ search: q, limit: 20, page: 1 });
      setResults(res.transactions ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) doSearch("");
  }, [open, doSearch]);

  useEffect(() => {
    const t = setTimeout(() => { if (open) doSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search, open, doSearch]);

  async function handleAdd(txId: string) {
    setAdding(txId);
    try {
      await api.trips.addTransaction(tripId, txId);
      onAdded();
      onOpenChange(false);
    } catch {
      // noop
    } finally {
      setAdding(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Transaction to Trip</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions found.</p>
          ) : (
            results.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-accent">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.transactionDate)} · {tx.category?.name ?? "Uncategorized"}
                  </p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${tx.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                  {tx.type === "expense" ? "-" : "+"}₹{fmt(tx.amount)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={adding === tx.id}
                  onClick={() => handleAdd(tx.id)}
                  className="shrink-0"
                >
                  {adding === tx.id ? "Adding..." : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const txLimit = 25;
  const txTotalPages = Math.ceil(txTotal / txLimit);

  async function loadAll(page = txPage) {
    setLoading(true);
    try {
      const [tripData, summaryData, txData] = await Promise.all([
        api.trips.getById(tripId),
        api.trips.getSummary(tripId),
        api.trips.getTransactions(tripId, { page, limit: txLimit }),
      ]);
      setTrip(tripData);
      setSummary(summaryData);
      setTransactions(txData.transactions ?? []);
      setTxTotal(txData.total);
    } catch {
      // handled by null checks
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(1);
  }, [tripId]);

  async function handleRemove(txId: string) {
    setRemovingId(txId);
    try {
      await api.trips.removeTransaction(tripId, txId);
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setTxTotal((prev) => prev - 1);
      // Refresh summary
      const s = await api.trips.getSummary(tripId);
      setSummary(s);
    } catch {
      // noop
    } finally {
      setRemovingId(null);
    }
  }

  async function handleDeleteTrip() {
    setDeleting(true);
    try {
      await api.trips.delete(tripId);
      router.push("/trips");
    } catch {
      setDeleting(false);
    }
  }

  async function handlePageChange(p: number) {
    setTxPage(p);
    const res = await api.trips.getTransactions(tripId, { page: p, limit: txLimit });
    setTransactions(res.transactions ?? []);
    setTxTotal(res.total);
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 p-6">
        <p className="text-lg font-medium">Trip not found</p>
        <Button variant="outline" onClick={() => router.push("/trips")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/trips")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{trip.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
            </div>
            {trip.description && (
              <p className="mt-1 text-sm text-muted-foreground">{trip.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">₹{fmt(summary?.totalExpense ?? 0)}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-600">₹{fmt(summary?.totalIncome ?? 0)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{summary?.transactionCount ?? 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.categoryBreakdown.map((cat, idx) => {
                const color = cat.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                return (
                  <div key={cat.categoryId || cat.categoryName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {cat.icon && <span>{cat.icon}</span>}
                        <span className="text-sm font-medium">{cat.categoryName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cat.count} txn{cat.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">₹{fmt(cat.totalAmount)}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transactions
            {txTotal > 0 && (
              <Badge variant="secondary">{txTotal}</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Add Transaction
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-8 w-8" />
              <p className="text-sm">No transactions in this trip yet.</p>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add Transaction
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-xs">{tx.description}</p>
                          {tx.merchant && (
                            <p className="text-xs text-muted-foreground">{tx.merchant}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span className={tx.type === "expense" ? "text-red-600" : "text-green-600"}>
                            {tx.type === "expense" ? "-" : "+"}₹{fmt(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tx.category ? (
                            <span className="flex items-center gap-1">
                              {tx.category.icon && <span>{tx.category.icon}</span>}
                              {tx.category.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {tx.source.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={removingId === tx.id}
                            onClick={() => handleRemove(tx.id)}
                            title="Remove from trip"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {txTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {(txPage - 1) * txLimit + 1}–{Math.min(txPage * txLimit, txTotal)} of {txTotal}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage <= 1}
                      onClick={() => handlePageChange(txPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= txTotalPages}
                      onClick={() => handlePageChange(txPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditTripDialog
        trip={trip}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(t) => { setTrip(t); }}
      />

      <AddTransactionDialog
        tripId={tripId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => loadAll(txPage)}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{trip.name}</span>? Transactions will not be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDeleteTrip}>
              {deleting ? "Deleting..." : "Delete Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
