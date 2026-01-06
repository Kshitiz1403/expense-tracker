"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AddTransactionDialogProps {
  trigger?: React.ReactNode;
}

export function AddTransactionDialog({ trigger }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense"
  );

  // Mock categories
  const categories = {
    income: ["Salary", "Freelance", "Investment", "Other Income"],
    expense: [
      "Groceries",
      "Utilities",
      "Shopping",
      "Dining",
      "Transport",
      "Healthcare",
      "Entertainment",
      "Savings",
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - will be connected to backend later
    console.log("Transaction submitted");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Transaction</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Enter the details of your transaction. All fields are required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
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

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g. Grocery shopping at Walmart"
                required
              />
            </div>

            {/* Merchant (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="merchant">
                Merchant <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input id="merchant" placeholder="e.g. Walmart" />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a category</option>
                {categories[transactionType].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="datetime-local"
                required
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Tags (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="tags"
                placeholder="e.g. weekly, essential (comma separated)"
              />
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
