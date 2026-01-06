import {
  Download,
  Search,
  Plus,
} from "lucide-react";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function TransactionsPage() {
  // Mock data
  const transactions = [
    {
      id: "1",
      description: "Salary Credit - Tech Corp",
      amount: 45000,
      type: "income",
      date: "2026-01-05T10:30:00",
      category: "Salary",
      source: "sms",
      merchant: "Tech Corp",
      confidence: 0.95,
    },
    {
      id: "2",
      description: "Grocery Shopping - Walmart",
      amount: -2500,
      type: "expense",
      date: "2026-01-04T15:20:00",
      category: "Groceries",
      source: "sms",
      merchant: "Walmart",
      confidence: 0.88,
    },
    {
      id: "3",
      description: "Electric Bill Payment",
      amount: -1200,
      type: "expense",
      date: "2026-01-03T09:15:00",
      category: "Utilities",
      source: "email",
      merchant: "Power Company",
      confidence: 0.92,
    },
    {
      id: "4",
      description: "Online Purchase - Amazon",
      amount: -3500,
      type: "expense",
      date: "2026-01-02T18:45:00",
      category: "Shopping",
      source: "email",
      merchant: "Amazon",
      confidence: 0.65,
    },
    {
      id: "5",
      description: "Freelance Payment",
      amount: 15000,
      type: "income",
      date: "2026-01-01T12:00:00",
      category: "Freelance",
      source: "bank_statement",
      merchant: "Client XYZ",
      confidence: 0.98,
    },
    {
      id: "6",
      description: "Restaurant - The Food Place",
      amount: -850,
      type: "expense",
      date: "2025-12-31T20:30:00",
      category: "Dining",
      source: "sms",
      merchant: "The Food Place",
      confidence: 0.75,
    },
    {
      id: "7",
      description: "Fuel - Gas Station",
      amount: -1500,
      type: "expense",
      date: "2025-12-30T08:00:00",
      category: "Transport",
      source: "sms",
      merchant: "Gas Station",
      confidence: 0.90,
    },
    {
      id: "8",
      description: "Investment Returns",
      amount: 5000,
      type: "income",
      date: "2025-12-29T14:00:00",
      category: "Investment",
      source: "email",
      merchant: "Investment Fund",
      confidence: 0.85,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, { label: string; variant: any }> = {
      sms: { label: "SMS", variant: "secondary" },
      email: { label: "Email", variant: "secondary" },
      bank_statement: { label: "Bank", variant: "secondary" },
      manual: { label: "Manual", variant: "outline" },
    };
    const config = sourceMap[source] || { label: source, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="success">High</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="warning">Medium</Badge>;
    } else {
      return <Badge variant="danger">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all your transactions
          </p>
        </div>
        <AddTransactionDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          }
        />
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Search transactions..." className="pl-10" />
            </div>

            <TransactionFilters />

            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.merchant}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">{transaction.category}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSourceBadge(transaction.source)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConfidenceBadge(transaction.confidence)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-base font-semibold tabular-nums ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">8</span> of{" "}
              <span className="font-medium">128</span> transactions
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
