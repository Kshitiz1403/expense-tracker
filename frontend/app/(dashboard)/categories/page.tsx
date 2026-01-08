"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { api, Category } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.categories.list();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <div className="text-center py-12 text-gray-500">
          Loading categories...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-gray-600 mt-1">
            Manage your income and expense categories
          </p>
        </div>
        <EditCategoryDialog onSuccess={fetchCategories}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </EditCategoryDialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No categories found. Create your first category to get started!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-600">📤</span> Expense Categories
                <Badge className="bg-red-100 text-red-700">
                  {expenseCategories.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expenseCategories.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No expense categories
                  </p>
                ) : (
                  expenseCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: category.color || "#EF4444" }}
                        >
                          {category.icon || "💰"}
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.monthlyBudget && (
                            <div className="text-sm text-gray-500">
                              Budget: ₹{category.monthlyBudget.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      </div>
                      {category.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Income Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">📥</span> Income Categories
                <Badge className="bg-green-100 text-green-700">
                  {incomeCategories.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incomeCategories.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No income categories
                  </p>
                ) : (
                  incomeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: category.color || "#10B981" }}
                        >
                          {category.icon || "💵"}
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                        </div>
                      </div>
                      {category.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
