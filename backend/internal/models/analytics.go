package models

// MonthlyBreakdown holds income/expense totals for a single calendar month
type MonthlyBreakdown struct {
	Month        string  `json:"month"`        // YYYY-MM
	MonthLabel   string  `json:"monthLabel"`   // e.g. "Jan 2026"
	TotalIncome  float64 `json:"totalIncome"`
	TotalExpense float64 `json:"totalExpense"`
	NetSavings   float64 `json:"netSavings"`
}

// CategoryBreakdown holds expense totals per category
type CategoryBreakdown struct {
	CategoryID   string  `json:"categoryId"`
	CategoryName string  `json:"categoryName"`
	Icon         string  `json:"icon"`
	Color        string  `json:"color"`
	TotalAmount  float64 `json:"totalAmount"`
	Percentage   float64 `json:"percentage"`
	Count        int     `json:"count"`
}

// MerchantBreakdown holds spending totals per merchant
type MerchantBreakdown struct {
	Merchant    string  `json:"merchant"`
	TotalAmount float64 `json:"totalAmount"`
	Count       int     `json:"count"`
}

// AnalyticsSummary is the response for GET /api/analytics/summary
type AnalyticsSummary struct {
	DateFrom string `json:"dateFrom"`
	DateTo   string `json:"dateTo"`

	TotalIncome  float64 `json:"totalIncome"`
	TotalExpense float64 `json:"totalExpense"`
	NetSavings   float64 `json:"netSavings"`
	SavingsRate  float64 `json:"savingsRate"` // percentage, 0 if no income

	AvgMonthlyIncome  float64 `json:"avgMonthlyIncome"`
	AvgMonthlyExpense float64 `json:"avgMonthlyExpense"`

	TopCategoryName       string  `json:"topCategoryName"`
	TopCategoryPercentage float64 `json:"topCategoryPercentage"`

	MonthlyBreakdown  []MonthlyBreakdown  `json:"monthlyBreakdown"`
	CategoryBreakdown []CategoryBreakdown `json:"categoryBreakdown"`
	TopMerchants      []MerchantBreakdown `json:"topMerchants"`
}
