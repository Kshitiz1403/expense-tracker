"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, PenLine, Loader2 } from "lucide-react";
import { api, SMSMessage, Transaction, SMSExtractResult, Category } from "@/lib/api";

type Mode = "choose" | "ai_loading" | "ai_preview" | "manual";

interface ConvertSMSDialogProps {
  sms: SMSMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (transaction: Transaction) => void;
}

export function ConvertSMSDialog({
  sms,
  open,
  onOpenChange,
  onSuccess,
}: ConvertSMSDialogProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPreview, setAIPreview] = useState<SMSExtractResult | null>(null);

  useEffect(() => {
    if (open) {
      setMode("choose");
      setError(null);
      setAIPreview(null);
      setTransactionType("expense");
      api.categories.list().then(setCategories).catch(() => {});
    }
  }, [open]);

  // Step 1: call extract — no transaction created
  const handleExtractWithAI = async () => {
    setMode("ai_loading");
    setError(null);
    try {
      const result = await api.sms.extract(sms.id);
      setAIPreview(result);
      setMode("ai_preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI extraction failed");
      setMode("choose");
    }
  };

  // Step 2: confirm — now creates the transaction using the extracted fields
  const handleConfirmAI = async () => {
    if (!aiPreview) return;
    setConfirming(true);
    setError(null);
    try {
      const transaction = await api.sms.convert(sms.id, {
        amount: aiPreview.amount,
        type: aiPreview.type,
        description: aiPreview.description,
        merchant: aiPreview.merchant || undefined,
        category_id: aiPreview.categoryId,
        category_name:
          !aiPreview.categoryId && aiPreview.category ? aiPreview.category : undefined,
      });
      onOpenChange(false);
      onSuccess(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setConfirming(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const transaction = await api.sms.convert(sms.id, {
        amount: parseFloat(formData.get("amount") as string),
        type: transactionType,
        description: formData.get("description") as string,
        merchant: (formData.get("merchant") as string) || undefined,
        category_id: (formData.get("category") as string) || undefined,
        transaction_date: (formData.get("date") as string) || undefined,
      });
      onOpenChange(false);
      onSuccess(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === transactionType);

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(sms.receivedAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Convert SMS to Transaction</DialogTitle>
          <DialogDescription>
            From: {sms.phoneNumber} &bull; {formattedDate}
          </DialogDescription>
        </DialogHeader>

        {/* Raw SMS message — always visible */}
        <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
          {sms.message}
        </div>

        {/* Mode: choose */}
        {mode === "choose" && (
          <div className="flex flex-col gap-3 py-2">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}
            <Button onClick={handleExtractWithAI} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Extract with AI
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setMode("manual")}>
              <PenLine className="mr-2 h-4 w-4" />
              Fill Manually
            </Button>
          </div>
        )}

        {/* Mode: ai_loading */}
        {mode === "ai_loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting transaction details...</p>
          </div>
        )}

        {/* Mode: ai_preview */}
        {mode === "ai_preview" && aiPreview && (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">Review extracted details:</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold">₹{aiPreview.amount.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type</span>
                <div className="mt-0.5">
                  <Badge
                    className={
                      aiPreview.type === "income"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }
                  >
                    {aiPreview.type}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Merchant</span>
                <p>{aiPreview.merchant || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category</span>
                <p>{aiPreview.category || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Description</span>
                <p>{aiPreview.description}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence</span>
                <div className="mt-0.5">
                  <Badge
                    className={
                      aiPreview.confidence >= 0.9
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                    }
                  >
                    {Math.round(aiPreview.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </div>
            {aiPreview.confidence < 0.9 && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                Low confidence — this will appear in the Review Queue for further confirmation.
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("choose")} disabled={confirming}>
                Back
              </Button>
              <Button onClick={handleConfirmAI} disabled={confirming}>
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm & Save"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Mode: manual */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transactionType === "expense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTransactionType("expense")}
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={transactionType === "income" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTransactionType("income")}
                >
                  Income
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                required
                placeholder="e.g. Grocery shopping"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant">
                Merchant{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="merchant" name="merchant" placeholder="e.g. Swiggy" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a category (optional)</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                Date{" "}
                <span className="text-muted-foreground font-normal">
                  (defaults to SMS received time)
                </span>
              </Label>
              <Input
                id="date"
                name="date"
                type="datetime-local"
                defaultValue={new Date(sms.receivedAt).toISOString().slice(0, 16)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("choose")}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Converting..." : "Create Transaction"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
