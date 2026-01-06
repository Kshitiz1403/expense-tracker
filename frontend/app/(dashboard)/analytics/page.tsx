import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  // Mock data for analytics
  const monthlyTrends = [
    { month: "Aug", income: 42000, expense: 28000 },
    { month: "Sep", income: 45000, expense: 31000 },
    { month: "Oct", income: 43000, expense: 29500 },
    { month: "Nov", income: 46000, expense: 32000 },
    { month: "Dec", income: 44000, expense: 30000 },
    { month: "Jan", income: 45000, expense: 28500 },
  ];

  const categoryBreakdown = [
    { name: "Groceries", amount: 12500, percentage: 31, color: "bg-orange-500" },
    { name: "Shopping", amount: 8500, percentage: 21, color: "bg-purple-500" },
    { name: "Dining", amount: 6200, percentage: 15, color: "bg-pink-500" },
    { name: "Transport", amount: 4500, percentage: 11, color: "bg-cyan-500" },
    { name: "Utilities", amount: 3600, percentage: 9, color: "bg-blue-500" },
    { name: "Others", amount: 5200, percentage: 13, color: "bg-gray-500" },
  ];

  const topMerchants = [
    { name: "Walmart", amount: 12500, transactions: 8, trend: 5 },
    { name: "Amazon", amount: 8500, transactions: 12, trend: -3 },
    { name: "Gas Station", amount: 4500, transactions: 6, trend: 2 },
    { name: "Restaurant Chain", amount: 3200, transactions: 4, trend: -1 },
    { name: "Utility Company", amount: 3600, transactions: 3, trend: 0 },
  ];

  const insights = [
    {
      type: "warning",
      title: "High Spending Alert",
      description: "Your shopping expenses are 25% higher than last month",
      icon: ShoppingBag,
    },
    {
      type: "success",
      title: "Savings Goal Met",
      description: "You've saved ₹16,500 this month - exceeding your goal!",
      icon: TrendingUp,
    },
    {
      type: "info",
      title: "Unusual Activity",
      description: "Groceries spending decreased by 15% compared to average",
      icon: TrendingDown,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Insights and trends from your financial data
          </p>
        </div>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Last 6 Months
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(44166)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">2.5%</span> vs last
              period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Monthly Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(29833)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">3.2%</span> decrease
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">32.5%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(14333)} per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Groceries</p>
            <p className="text-xs text-muted-foreground mt-1">
              31% of total spending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-around gap-4 pb-4">
              {monthlyTrends.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col gap-1 items-center">
                    <div className="w-full flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{
                          height: `${(data.income / 50000) * 200}px`,
                        }}
                      />
                      <div
                        className="w-full bg-red-500 rounded-t opacity-70"
                        style={{
                          height: `${(data.expense / 50000) * 200}px`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.month}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded opacity-70" />
                <span className="text-sm">Expense</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.map((category, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${category.color}`} />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {category.percentage}%
                      </span>
                      <span className="font-semibold min-w-[80px] text-right">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${category.color}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your most frequented places
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topMerchants.map((merchant, i) => (
              <div
                key={i}
                className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-primary">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{merchant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {merchant.transactions} transactions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {merchant.trend !== 0 && (
                    <Badge
                      variant={merchant.trend > 0 ? "danger" : "success"}
                      className="text-xs"
                    >
                      {merchant.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(merchant.trend)}%
                    </Badge>
                  )}
                  <p className="font-bold text-lg min-w-[100px] text-right">
                    {formatCurrency(merchant.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-4">AI-Powered Insights</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            const variantMap: Record<string, string> = {
              warning: "border-amber-200 bg-amber-50",
              success: "border-green-200 bg-green-50",
              info: "border-blue-200 bg-blue-50",
            };
            const iconColorMap: Record<string, string> = {
              warning: "text-amber-600",
              success: "text-green-600",
              info: "text-blue-600",
            };

            return (
              <Card key={i} className={variantMap[insight.type]}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${iconColorMap[insight.type]}`} />
                    <div>
                      <h3 className="font-semibold">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
