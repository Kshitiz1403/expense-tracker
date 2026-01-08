"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Transaction } from "@/lib/api";

export default function ReviewQueuePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    try {
      setLoading(true);
      const response = await api.transactions.reviewQueue();
      setTransactions(response.transactions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch review queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.transactions.approve(id);
      // Refresh the queue
      await fetchReviewQueue();
    } catch (err) {
      console.error("Failed to approve transaction:", err);
    }
  };

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
        <Badge className="bg-green-100 text-green-700">
          High {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    } else if (confidence >= 0.5) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          Medium {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-700">
          Low {(confidence * 100).toFixed(0)}%
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <div className="text-center py-12 text-gray-500">
          Loading review queue...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            Review Queue
          </h1>
          <p className="text-gray-600">
            Review and approve AI-categorized transactions with low confidence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">Pending Reviews</p>
            <p className="text-2xl font-bold text-amber-600">
              {transactions.length}
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
                your review due to low confidence scores (&lt;90%). Your feedback helps improve
                future categorizations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Items */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            🎉 No transactions pending review! All transactions have been approved.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {transaction.description}
                      </CardTitle>
                      {transaction.aiConfidence &&
                        getConfidenceBadge(transaction.aiConfidence)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.transactionDate)} • {transaction.source.toUpperCase()}
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">AI Suggested Category</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-base">
                          {transaction.aiSuggestedCategory?.name || "Unknown"}
                        </Badge>
                        {transaction.aiConfidence && (
                          <span className="text-xs text-gray-500">
                            {(transaction.aiConfidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleApprove(transaction.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve Category
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Change Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
