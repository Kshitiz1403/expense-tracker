package repository

import (
	"time"

	"gorm.io/gorm"
)

type AnalyticsRepository struct {
	db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

type TotalsRow struct {
	TotalIncome  float64
	TotalExpense float64
}

type MonthlyRow struct {
	Month        string
	TotalIncome  float64
	TotalExpense float64
}

type CategoryRow struct {
	CategoryID   string
	CategoryName string
	Icon         string
	Color        string
	TotalAmount  float64
	Count        int
}

type MerchantRow struct {
	Merchant    string
	TotalAmount float64
	Count       int
}

func (r *AnalyticsRepository) GetOverallTotals(dateFrom, dateTo time.Time) (TotalsRow, error) {
	var row TotalsRow
	err := r.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
		FROM transactions
		WHERE deleted_at IS NULL
		  AND transaction_date >= ?
		  AND transaction_date <= ?
	`, dateFrom, dateTo).Scan(&row).Error
	return row, err
}

func (r *AnalyticsRepository) GetMonthlySummary(dateFrom, dateTo time.Time) ([]MonthlyRow, error) {
	var rows []MonthlyRow
	err := r.db.Raw(`
		SELECT
			TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
			COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
		FROM transactions
		WHERE deleted_at IS NULL
		  AND transaction_date >= ?
		  AND transaction_date <= ?
		GROUP BY DATE_TRUNC('month', transaction_date)
		ORDER BY DATE_TRUNC('month', transaction_date) ASC
	`, dateFrom, dateTo).Scan(&rows).Error
	return rows, err
}

func (r *AnalyticsRepository) GetCategoryBreakdown(dateFrom, dateTo time.Time) ([]CategoryRow, error) {
	var rows []CategoryRow
	err := r.db.Raw(`
		SELECT
			COALESCE(c.id::text, '')         AS category_id,
			COALESCE(c.name, 'Uncategorized') AS category_name,
			COALESCE(c.icon, '')             AS icon,
			COALESCE(c.color, '')            AS color,
			SUM(t.amount)                    AS total_amount,
			COUNT(t.id)                      AS count
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.deleted_at IS NULL
		  AND t.type = 'expense'
		  AND t.transaction_date >= ?
		  AND t.transaction_date <= ?
		GROUP BY c.id, c.name, c.icon, c.color
		ORDER BY total_amount DESC
	`, dateFrom, dateTo).Scan(&rows).Error
	return rows, err
}

func (r *AnalyticsRepository) GetTopMerchants(dateFrom, dateTo time.Time, limit int) ([]MerchantRow, error) {
	var rows []MerchantRow
	err := r.db.Raw(`
		SELECT
			merchant,
			SUM(amount) AS total_amount,
			COUNT(id)   AS count
		FROM transactions
		WHERE deleted_at IS NULL
		  AND type = 'expense'
		  AND merchant IS NOT NULL
		  AND merchant != ''
		  AND transaction_date >= ?
		  AND transaction_date <= ?
		GROUP BY merchant
		ORDER BY total_amount DESC
		LIMIT ?
	`, dateFrom, dateTo, limit).Scan(&rows).Error
	return rows, err
}
