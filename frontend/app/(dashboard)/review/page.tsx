import { Check, X, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ReviewQueuePage() {
  // Mock data for transactions needing review
  const pendingReviews = [
    {
      id: "4",
      description: "Online Purchase - Amazon",
      amount: -3500,
      type: "expense",
      date: "2026-01-02T18:45:00",
      aiSuggestedCategory: "Shopping",
      confidence: 0.65,
      source: "email",
      rawData: "Your Amazon order #123-456 has been charged ₹3,500...",
    },
    {
      id: "6",
      description: "Restaurant - The Food Place",
      amount: -850,
      type: "expense",
      date: "2025-12-31T20:30:00",
      aiSuggestedCategory: "Dining",
      confidence: 0.75,
      source: "sms",
      rawData: "Payment of Rs850 at THE FOOD PLACE on 31-Dec...",
    },
    {
      id: "9",
      description: "Transfer to Savings",
      amount: -10000,
      type: "expense",
      date: "2025-12-28T12:00:00",
      aiSuggestedCategory: "Savings",
      confidence: 0.55,
      source: "bank_statement",
      rawData: "Transfer 10000 to savings account ending in 5678",
    },
    {
      id: "10",
      description: "Cash Withdrawal",
      amount: -5000,
      type: "expense",
      date: "2025-12-27T16:30:00",
      aiSuggestedCategory: "Cash",
      confidence: 0.48,
      source: "sms",
      rawData: "ATM WITHDRAWAL Rs5000 from Main Street ATM",
    },
    {
      id: "11",
      description: "Unknown Credit",
      amount: 2500,
      type: "income",
      date: "2025-12-26T09:00:00",
      aiSuggestedCategory: "Other Income",
      confidence: 0.40,
      source: "bank_statement",
      rawData: "CREDIT IMPS REF12345 2500.00 CR",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge variant="success">
          High {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    } else if (confidence >= 0.5) {
      return (
        <Badge variant="warning">
          Medium {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="danger">
          Low {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            Review Queue
          </h1>
          <p className="text-muted-foreground">
            Review and approve AI-categorized transactions with low confidence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Pending Reviews</p>
            <p className="text-2xl font-bold text-amber-600">
              {pendingReviews.length}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                Action Required
              </p>
              <p className="text-sm text-amber-700 mt-1">
                These transactions have been automatically categorized by AI, but require
                your review due to low confidence scores. Your feedback helps improve
                future categorizations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Items */}
      <div className="space-y-4">
        {pendingReviews.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {transaction.description}
                    </CardTitle>
                    {getConfidenceBadge(transaction.confidence)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(transaction.date)} • {transaction.source.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-bold tabular-nums ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Suggestion */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">AI Suggested Category</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-base">
                        {transaction.aiSuggestedCategory}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(transaction.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Data */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Original Message
                </p>
                <div className="bg-muted/30 rounded p-3 text-sm font-mono">
                  {transaction.rawData}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="default" className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  Approve Category
                </Button>
                <Button variant="outline" className="flex-1">
                  Change Category
                </Button>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Batch Actions */}
      {pendingReviews.length > 0 && (
        <Card className="sticky bottom-6 border-primary shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {pendingReviews.length} transactions awaiting review
              </p>
              <div className="flex gap-2">
                <Button variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Dismiss All
                </Button>
                <Button>
                  <Check className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
