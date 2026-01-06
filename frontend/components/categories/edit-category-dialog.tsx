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

interface EditCategoryDialogProps {
  trigger?: React.ReactNode;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: "income" | "expense";
  };
}

export function EditCategoryDialog({
  trigger,
  category,
}: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - will be connected to backend later
    console.log("Category updated");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Edit Category</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {category ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {category
                ? "Update the category details below."
                : "Create a new category for organizing your transactions."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g. Groceries"
                defaultValue={category?.name}
                required
              />
            </div>

            {/* Category Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                required
                defaultValue={category?.type || "expense"}
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
                placeholder="🛒"
                defaultValue={category?.icon}
                maxLength={2}
                required
              />
              <p className="text-xs text-muted-foreground">
                Choose an emoji to represent this category
              </p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  defaultValue={
                    category?.color.includes("bg-")
                      ? "#f97316"
                      : category?.color
                  }
                  className="w-20 h-10"
                />
                <Input
                  id="color-name"
                  placeholder="or use Tailwind class"
                  defaultValue={category?.color}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Examples: bg-orange-500, bg-blue-500, bg-purple-500
              </p>
            </div>

            {/* Spending Limit (Optional for expenses) */}
            <div className="space-y-2">
              <Label htmlFor="limit">
                Monthly Budget Limit{" "}
                <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="limit"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
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
            <Button type="submit">
              {category ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
