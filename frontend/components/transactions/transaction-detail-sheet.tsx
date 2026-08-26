"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Calendar, Tag, Building2, Smartphone, FileText, Map, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, Transaction, Trip } from "@/lib/api";

interface TransactionDetailSheetProps {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailSheet({
  transactionId,
  onClose,
}: TransactionDetailSheetProps) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkedTrips, setLinkedTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [addingTripId, setAddingTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setTransaction(null);
      setLinkedTrips([]);
      return;
    }
    setLoading(true);
    Promise.all([
      api.transactions.getById(transactionId),
      api.transactions.getTrips(transactionId),
      api.trips.list({ limit: 100 }),
    ])
      .then(([tx, tripsRes, allTripsRes]) => {
        setTransaction(tx);
        setLinkedTrips(tripsRes.trips ?? []);
        setAllTrips(allTripsRes.trips ?? []);
      })
      .catch(() => setTransaction(null))
      .finally(() => setLoading(false));
  }, [transactionId]);

  async function handleAddToTrip(tripId: string) {
    if (!transactionId) return;
    setAddingTripId(tripId);
    try {
      await api.trips.addTransaction(tripId, transactionId);
      const res = await api.transactions.getTrips(transactionId);
      setLinkedTrips(res.trips ?? []);
    } catch {
      // noop
    } finally {
      setAddingTripId(null);
    }
  }

  async function handleRemoveFromTrip(tripId: string) {
    if (!transactionId) return;
    try {
      await api.trips.removeTransaction(tripId, transactionId);
      setLinkedTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch {
      // noop
    }
  }

  const unlinkedTrips = allTrips.filter(
    (t) => !linkedTrips.some((lt) => lt.id === t.id)
  );

  const formatDate = (dateString: string, includeTime = false) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(includeTime && { hour: "2-digit", minute: "2-digit" }),
    }).format(date);
  };

  const sourceColors: Record<string, string> = {
    sms: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    email: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    bank_statement: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    manual: "bg-muted text-muted-foreground",
  };

  return (
    <Sheet open={!!transactionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Transaction Details</SheetTitle>
          <SheetDescription>
            Full details and source message for this transaction.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        )}

        {!loading && transaction && (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
            {/* Amount */}
            <div className="text-center py-4">
              <div
                className={`text-4xl font-bold ${
                  transaction.type === "income"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}₹
                {transaction.amount.toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {transaction.type === "income" ? "Income" : "Expense"}
              </div>
            </div>

            <Separator />

            {/* Core fields */}
            <div className="space-y-3">
              <DetailRow
                icon={<FileText className="h-4 w-4" />}
                label="Description"
                value={transaction.description}
              />
              {transaction.merchant && (
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Merchant"
                  value={transaction.merchant}
                />
              )}
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Transaction Date"
                value={formatDate(transaction.transactionDate)}
              />
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label="Category"
                value={transaction.category?.name ?? "—"}
              />
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground mt-0.5">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">Source</div>
                  <Badge className={sourceColors[transaction.source] ?? sourceColors.manual}>
                    {transaction.source}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    Notes
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {transaction.notes}
                  </p>
                </div>
              </>
            )}

            {/* AI info */}
            {transaction.aiConfidence != null && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    AI Analysis
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <Badge
                        className={
                          transaction.aiConfidence >= 0.9
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }
                      >
                        {Math.round(transaction.aiConfidence * 100)}%
                      </Badge>
                    </div>
                    {transaction.aiSuggestedCategory && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Suggested category</span>
                        <span>{transaction.aiSuggestedCategory.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Raw source message */}
            {transaction.sourceMessage && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      Original SMS
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 space-y-2 dark:bg-blue-950/30 dark:border-blue-900">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {transaction.sourceMessage.message}
                    </p>
                    <div className="text-xs text-muted-foreground pt-1 border-t border-blue-100 dark:border-blue-900 flex gap-4">
                      <span>From: {transaction.sourceMessage.phoneNumber}</span>
                      <span>
                        {formatDate(transaction.sourceMessage.receivedAt, true)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Trips */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Map className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Trips</span>
              </div>
              {linkedTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-2">Not part of any trip.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-2">
                  {linkedTrips.map((t) => (
                    <Badge
                      key={t.id}
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-accent"
                      onClick={() => router.push(`/trips/${t.id}`)}
                    >
                      {t.name}
                      <X
                        className="h-3 w-3 ml-0.5 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromTrip(t.id); }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              {unlinkedTrips.length > 0 && (
                <Select
                  value=""
                  onValueChange={(tripId) => { if (tripId) handleAddToTrip(tripId); }}
                  disabled={addingTripId !== null}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={addingTripId ? "Adding..." : "Add to trip…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedTrips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <div>ID: {transaction.id}</div>
              <div>Created: {formatDate(transaction.createdAt, true)}</div>
              <div>Updated: {formatDate(transaction.updatedAt, true)}</div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}
