import { Plus, Edit, Folder, Tag as TagIcon } from "lucide-react";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CategoriesPage() {
  // Mock data for categories
  const categories = {
    income: [
      {
        id: "1",
        name: "Salary",
        color: "bg-green-500",
        icon: "💼",
        transactionCount: 2,
        totalAmount: 45000,
      },
      {
        id: "2",
        name: "Freelance",
        color: "bg-emerald-500",
        icon: "💻",
        transactionCount: 1,
        totalAmount: 15000,
      },
      {
        id: "3",
        name: "Investment",
        color: "bg-teal-500",
        icon: "📈",
        transactionCount: 1,
        totalAmount: 5000,
      },
      {
        id: "4",
        name: "Other Income",
        color: "bg-lime-500",
        icon: "💰",
        transactionCount: 1,
        totalAmount: 2500,
      },
    ],
    expense: [
      {
        id: "5",
        name: "Groceries",
        color: "bg-orange-500",
        icon: "🛒",
        transactionCount: 4,
        totalAmount: 12500,
      },
      {
        id: "6",
        name: "Utilities",
        color: "bg-blue-500",
        icon: "⚡",
        transactionCount: 3,
        totalAmount: 3600,
      },
      {
        id: "7",
        name: "Shopping",
        color: "bg-purple-500",
        icon: "🛍️",
        transactionCount: 2,
        totalAmount: 8500,
      },
      {
        id: "8",
        name: "Dining",
        color: "bg-pink-500",
        icon: "🍽️",
        transactionCount: 5,
        totalAmount: 6200,
      },
      {
        id: "9",
        name: "Transport",
        color: "bg-cyan-500",
        icon: "🚗",
        transactionCount: 3,
        totalAmount: 4500,
      },
      {
        id: "10",
        name: "Healthcare",
        color: "bg-red-500",
        icon: "🏥",
        transactionCount: 1,
        totalAmount: 2800,
      },
      {
        id: "11",
        name: "Entertainment",
        color: "bg-indigo-500",
        icon: "🎬",
        transactionCount: 2,
        totalAmount: 1500,
      },
      {
        id: "12",
        name: "Savings",
        color: "bg-amber-500",
        icon: "🏦",
        transactionCount: 1,
        totalAmount: 10000,
      },
    ],
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = categories.income.reduce(
    (sum, cat) => sum + cat.totalAmount,
    0
  );
  const totalExpense = categories.expense.reduce(
    (sum, cat) => sum + cat.totalAmount,
    0
  );

  const CategoryCard = ({
    category,
  }: {
    category: {
      id: string;
      name: string;
      color: string;
      icon: string;
      transactionCount: number;
      totalAmount: number;
    };
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`${category.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}
            >
              {category.icon}
            </div>
            <div>
              <h3 className="font-semibold">{category.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {category.transactionCount}{" "}
                {category.transactionCount === 1 ? "transaction" : "transactions"}
              </p>
              <p className="text-lg font-bold mt-2">
                {formatCurrency(category.totalAmount)}
              </p>
            </div>
          </div>
          <div>
            <EditCategoryDialog
              category={{
                id: category.id,
                name: category.name,
                icon: category.icon,
                color: category.color,
                type: "expense" as "income" | "expense",
              }}
              trigger={
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TagIcon className="h-8 w-8" />
            Categories
          </h1>
          <p className="text-muted-foreground">
            Organize your transactions with custom categories
          </p>
        </div>
        <EditCategoryDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {categories.income.length + categories.expense.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {categories.income.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(totalIncome)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {categories.expense.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(totalExpense)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">Income Categories</h2>
          <Badge variant="success">{categories.income.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.income.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-red-600" />
          <h2 className="text-xl font-semibold">Expense Categories</h2>
          <Badge variant="expense">{categories.expense.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.expense.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
