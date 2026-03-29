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
import { api } from "@/lib/api";

interface EditCategoryDialogProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function EditCategoryDialog({
  onSuccess,
  children,
}: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const colorInput = formData.get("color") as string;
      
      await api.categories.create({
        name: formData.get("name") as string,
        type: formData.get("type") as "income" | "expense",
        icon: formData.get("icon") as string || undefined,
        color: colorInput || undefined,
        monthly_budget: formData.get("budget") 
          ? parseFloat(formData.get("budget") as string)
          : undefined,
      });

      setOpen(false);
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Create Category</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing your transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Groceries"
                required
              />
            </div>

            {/* Category Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                required
                defaultValue="expense"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            {/* Icon (Emoji) */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <Input
                id="icon"
                name="icon"
                placeholder="🛒"
                maxLength={2}
              />
              <p className="text-xs text-gray-500">
                Choose an emoji to represent this category
              </p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color (Hex Code)</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue="#F59E0B"
                  className="w-20 h-10"
                />
                <Input
                  id="color-text"
                  placeholder="#F59E0B"
                  className="flex-1"
                  disabled
                  value={
                    (document.getElementById("color") as HTMLInputElement)?.value || "#F59E0B"
                  }
                />
              </div>
            </div>

            {/* Monthly Budget (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="budget">
                Monthly Budget{" "}
                <span className="text-gray-500">(Optional)</span>
              </Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                placeholder="5000.00"
                min="0"
                step="0.01"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
