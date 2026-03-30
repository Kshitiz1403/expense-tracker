package handlers

import (
	"net/http"
	"strconv"
	"time"

	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"

	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	analyticsRepo *repository.AnalyticsRepository
}

func NewAnalyticsHandler(repo *repository.AnalyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsRepo: repo}
}

// GetSummary handles GET /api/analytics/summary
// Query params:
//   - months: 3 | 6 | 12 (default 6) — shortcut for a relative date range
//   - date_from, date_to: explicit date range (overrides months)
func (h *AnalyticsHandler) GetSummary(c *gin.Context) {
	now := time.Now()
	var dateFrom, dateTo time.Time

	if from := c.Query("date_from"); from != "" {
		parsed, err := time.Parse("2006-01-02", from)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_from, use YYYY-MM-DD"})
			return
		}
		dateFrom = parsed
	}
	if to := c.Query("date_to"); to != "" {
		parsed, err := time.Parse("2006-01-02", to)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_to, use YYYY-MM-DD"})
			return
		}
		dateTo = parsed.Add(24*time.Hour - time.Second) // end of day
	}

	// If no explicit range, use months param (default 6)
	if dateFrom.IsZero() || dateTo.IsZero() {
		months := 6
		if m := c.Query("months"); m != "" {
			if parsed, err := strconv.Atoi(m); err == nil && parsed > 0 {
				months = parsed
			}
		}
		dateTo = now
		dateFrom = now.AddDate(0, -months, 0)
	}

	// Run all four queries
	totals, err := h.analyticsRepo.GetOverallTotals(dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch totals"})
		return
	}

	monthlyRows, err := h.analyticsRepo.GetMonthlySummary(dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch monthly summary"})
		return
	}

	categoryRows, err := h.analyticsRepo.GetCategoryBreakdown(dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch category breakdown"})
		return
	}

	merchantRows, err := h.analyticsRepo.GetTopMerchants(dateFrom, dateTo, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch top merchants"})
		return
	}

	// Build monthly breakdown
	monthly := make([]models.MonthlyBreakdown, 0, len(monthlyRows))
	for _, r := range monthlyRows {
		label := r.Month
		if t, err := time.Parse("2006-01", r.Month); err == nil {
			label = t.Format("Jan 2006")
		}
		monthly = append(monthly, models.MonthlyBreakdown{
			Month:        r.Month,
			MonthLabel:   label,
			TotalIncome:  r.TotalIncome,
			TotalExpense: r.TotalExpense,
			NetSavings:   r.TotalIncome - r.TotalExpense,
		})
	}

	// Build category breakdown with percentages
	categories := make([]models.CategoryBreakdown, 0, len(categoryRows))
	for _, r := range categoryRows {
		pct := 0.0
		if totals.TotalExpense > 0 {
			pct = (r.TotalAmount / totals.TotalExpense) * 100
		}
		categories = append(categories, models.CategoryBreakdown{
			CategoryID:   r.CategoryID,
			CategoryName: r.CategoryName,
			Icon:         r.Icon,
			Color:        r.Color,
			TotalAmount:  r.TotalAmount,
			Percentage:   pct,
			Count:        r.Count,
		})
	}

	// Build merchants list
	merchants := make([]models.MerchantBreakdown, 0, len(merchantRows))
	for _, r := range merchantRows {
		merchants = append(merchants, models.MerchantBreakdown{
			Merchant:    r.Merchant,
			TotalAmount: r.TotalAmount,
			Count:       r.Count,
		})
	}

	// Compute derived totals
	netSavings := totals.TotalIncome - totals.TotalExpense
	savingsRate := 0.0
	if totals.TotalIncome > 0 {
		savingsRate = (netSavings / totals.TotalIncome) * 100
	}

	numMonths := float64(len(monthly))
	if numMonths == 0 {
		numMonths = 1
	}
	avgIncome := totals.TotalIncome / numMonths
	avgExpense := totals.TotalExpense / numMonths

	topCatName := ""
	topCatPct := 0.0
	if len(categories) > 0 {
		topCatName = categories[0].CategoryName
		topCatPct = categories[0].Percentage
	}

	summary := models.AnalyticsSummary{
		DateFrom:              dateFrom.Format("2006-01-02"),
		DateTo:                dateTo.Format("2006-01-02"),
		TotalIncome:           totals.TotalIncome,
		TotalExpense:          totals.TotalExpense,
		NetSavings:            netSavings,
		SavingsRate:           savingsRate,
		AvgMonthlyIncome:      avgIncome,
		AvgMonthlyExpense:     avgExpense,
		TopCategoryName:       topCatName,
		TopCategoryPercentage: topCatPct,
		MonthlyBreakdown:      monthly,
		CategoryBreakdown:     categories,
		TopMerchants:          merchants,
	}

	c.JSON(http.StatusOK, summary)
}
