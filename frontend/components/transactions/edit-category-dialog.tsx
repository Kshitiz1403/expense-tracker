"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api, Category } from "@/lib/api";

interface EditCategoryDialogProps {
  transactionId: string;
  transactionType: "income" | "expense";
  currentCategoryId?: string;
  currentCategoryName?: string;
  onSuccess: () => void;
}

export function EditCategoryDialog({
  transactionId,
  transactionType,
  currentCategoryId,
  currentCategoryName,
  onSuccess,
}: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState(currentCategoryId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId(currentCategoryId ?? "");
      setError(null);
      api.categories.list().then(setCategories).catch(() => {});
    }
  }, [open, currentCategoryId]);

  const filteredCategories = categories.filter(
    (cat) => cat.type === transactionType
  );

  const handleSave = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      await api.transactions.update(transactionId, { category_id: selectedId });
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={
            currentCategoryId
              ? "text-amber-500 hover:text-amber-600"
              : ""
          }
          title={currentCategoryId ? `Change category (${currentCategoryName})` : "Assign category"}
        >
          <Tag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {currentCategoryId ? "Change Category" : "Assign Category"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              Select a category
            </option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !selectedId}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
