"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api, AnalyticsSummary } from "@/lib/api";

const FALLBACK_COLORS = [
  "#f97316", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#eab308", "#ef4444", "#22c55e",
  "#6366f1", "#f59e0b",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

type PresetKey = "1d" | "7d" | "15d" | "1m" | "3m" | "6m" | "12m" | "custom";

const PRESETS: { label: string; key: PresetKey; months?: number; days?: number }[] = [
  { label: "Last 1 Day",     key: "1d",     days: 1    },
  { label: "Last 7 Days",    key: "7d",     days: 7    },
  { label: "Last 15 Days",   key: "15d",    days: 15   },
  { label: "Last 1 Month",   key: "1m",     months: 1  },
  { label: "Last 3 Months",  key: "3m",     months: 3  },
  { label: "Last 6 Months",  key: "6m",     months: 6  },
  { label: "Last 12 Months", key: "12m",    months: 12 },
  { label: "Custom Range",   key: "custom"              },
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetKey>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const load = async () => {
      let params: Parameters<typeof api.analytics.summary>[0];

      if (preset === "custom") {
        if (!customFrom || !customTo) return;
        params = { dateFrom: customFrom, dateTo: customTo };
      } else {
        const p = PRESETS.find((x) => x.key === preset)!;
        if (p.days !== undefined) {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - p.days);
          params = { dateFrom: toISODate(from), dateTo: toISODate(to) };
        } else {
          params = { months: p.months };
        }
      }

      try {
        setLoading(true);
        const result = await api.analytics.summary(params);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [preset, customFrom, customTo]);

  const selectedPreset = PRESETS.find((p) => p.key === preset)!;

  const hasData = data && (data.totalIncome > 0 || data.totalExpense > 0);

  const SkeletonCard = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-7 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </CardContent>
    </Card>
  );

  const insights = data
    ? [
        {
          type: data.savingsRate > 20 ? "success" : "warning",
          icon: data.savingsRate > 20 ? CheckCircle : AlertTriangle,
          title: data.savingsRate > 20 ? "Good savings rate" : "Low savings rate",
          text: `You saved ${data.savingsRate.toFixed(1)}% of your income during the selected period.`,
        },
        {
          type: "info",
          icon: Info,
          title: "Top spending category",
          text: data.topCategoryName
            ? `${data.topCategoryName} accounts for ${data.topCategoryPercentage.toFixed(1)}% of your total expenses.`
            : "No expense categories found for this period.",
        },
        {
          type: data.netSavings >= 0 ? "success" : "warning",
          icon: data.netSavings >= 0 ? TrendingUp : TrendingDown,
          title: data.netSavings >= 0 ? "Positive net savings" : "Spending exceeds income",
          text: `Your net ${data.netSavings >= 0 ? "savings" : "deficit"} this period: ₹${fmt(Math.abs(data.netSavings))}.`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600 mt-1">Insights into your spending patterns</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
            <SelectTrigger className="w-44">
              <SelectValue>{selectedPreset.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <>
              <Input
                type="date"
                className="w-36"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="date"
                className="w-36"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">{error}</div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Monthly Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{fmt(data?.avgMonthlyIncome ?? 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: ₹{fmt(data?.totalIncome ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Monthly Expense</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{fmt(data?.avgMonthlyExpense ?? 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: ₹{fmt(data?.totalExpense ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold">
                      {(data?.savingsRate ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Net: ₹{fmt(data?.netSavings ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Top Category</p>
                    <p className="text-2xl font-bold truncate max-w-[120px]">
                      {data?.topCategoryName || "—"}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <PieChart className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(data?.topCategoryPercentage ?? 0).toFixed(1)}% of expenses
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Monthly Income vs Expense Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Income vs Expense Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] animate-pulse bg-gray-100 rounded" />
          ) : !hasData || data.monthlyBreakdown.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2">
              <BarChart3 className="h-12 w-12" />
              <p>No transactions yet for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`
                  }
                />
                <Tooltip
                  formatter={(value) => [`₹${fmt(Number(value))}`, undefined]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend />
                <Bar dataKey="totalIncome" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="totalExpense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-2 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : !hasData || data.categoryBreakdown.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                <PieChart className="h-10 w-10" />
                <p>No expense data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.categoryBreakdown.map((cat, idx) => {
                  const color = cat.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                  return (
                    <div key={cat.categoryId || cat.categoryName}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {cat.icon && <span>{cat.icon}</span>}
                          <span className="text-sm font-medium">{cat.categoryName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {cat.count} txn{cat.count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">₹{fmt(cat.totalAmount)}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(cat.percentage, 100)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : !hasData || data.topMerchants.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                <ShoppingBag className="h-10 w-10" />
                <p>No merchant data for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topMerchants.map((m, idx) => (
                  <div key={m.merchant} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-4">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{m.merchant}</p>
                        <p className="text-xs text-gray-500">
                          {m.count} transaction{m.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">₹{fmt(m.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {!loading && hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, idx) => {
                const Icon = insight.icon;
                const colors = {
                  warning: "border-yellow-200 bg-yellow-50",
                  success: "border-green-200 bg-green-50",
                  info: "border-blue-200 bg-blue-50",
                };
                const iconColors = {
                  warning: "text-yellow-600",
                  success: "text-green-600",
                  info: "text-blue-600",
                };
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-4 ${colors[insight.type as keyof typeof colors]}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${iconColors[insight.type as keyof typeof iconColors]}`} />
                      <span className="text-sm font-medium">{insight.title}</span>
                    </div>
                    <p className="text-sm text-gray-600">{insight.text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
