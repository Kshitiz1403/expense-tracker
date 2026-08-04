package repository

import (
	"expense-tracker/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TripRepository struct {
	db *gorm.DB
}

func NewTripRepository(db *gorm.DB) *TripRepository {
	return &TripRepository{db: db}
}

// --- CRUD ---

func (r *TripRepository) Create(trip *models.Trip) error {
	return r.db.Create(trip).Error
}

func (r *TripRepository) GetByID(id uuid.UUID) (*models.Trip, error) {
	var trip models.Trip
	err := r.db.First(&trip, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &trip, err
}

func (r *TripRepository) GetAll(limit, offset int) ([]models.Trip, int64, error) {
	var trips []models.Trip
	var total int64
	base := r.db.Model(&models.Trip{})
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := base.Order("start_date DESC").Limit(limit).Offset(offset).Find(&trips).Error
	return trips, total, err
}

func (r *TripRepository) Update(trip *models.Trip) error {
	trip.Transactions = nil // prevent GORM from reconciling associations on Save
	return r.db.Save(trip).Error
}

func (r *TripRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Trip{}, "id = ?", id).Error
}

// --- Association management ---

// AddTransaction links a transaction to a trip (idempotent).
func (r *TripRepository) AddTransaction(tripID, transactionID uuid.UUID) error {
	return r.db.Exec(`
		INSERT INTO transaction_trips (trip_id, transaction_id, created_at)
		VALUES (?, ?, NOW())
		ON CONFLICT (trip_id, transaction_id) DO NOTHING
	`, tripID, transactionID).Error
}

// RemoveTransaction unlinks a transaction from a trip.
func (r *TripRepository) RemoveTransaction(tripID, transactionID uuid.UUID) error {
	return r.db.Exec(`
		DELETE FROM transaction_trips
		WHERE trip_id = ? AND transaction_id = ?
	`, tripID, transactionID).Error
}

// GetTransactions returns paginated transactions for a trip.
func (r *TripRepository) GetTransactions(tripID uuid.UUID, limit, offset int) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	base := r.db.Model(&models.Transaction{}).
		Joins("JOIN transaction_trips tt ON tt.transaction_id = transactions.id").
		Where("tt.trip_id = ? AND transactions.deleted_at IS NULL", tripID)

	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := base.Preload("Category").
		Order("transactions.transaction_date DESC, transactions.created_at DESC").
		Limit(limit).Offset(offset).
		Find(&transactions).Error
	return transactions, total, err
}

// GetTripsForTransaction returns all trips a transaction belongs to.
func (r *TripRepository) GetTripsForTransaction(transactionID uuid.UUID) ([]models.Trip, error) {
	var trips []models.Trip
	err := r.db.
		Joins("JOIN transaction_trips tt ON tt.trip_id = trips.id").
		Where("tt.transaction_id = ? AND trips.deleted_at IS NULL", transactionID).
		Order("trips.start_date DESC").
		Find(&trips).Error
	return trips, err
}

// --- Analytics ---

// GetTripSummary returns total spending and category breakdown for a trip.
func (r *TripRepository) GetTripSummary(tripID uuid.UUID) (models.TripSummary, error) {
	// Totals
	var totals struct {
		TotalExpense float64
		TotalIncome  float64
		Count        int
	}
	err := r.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
			COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS total_income,
			COUNT(t.id) AS count
		FROM transactions t
		JOIN transaction_trips tt ON tt.transaction_id = t.id
		WHERE tt.trip_id = ? AND t.deleted_at IS NULL
	`, tripID).Scan(&totals).Error
	if err != nil {
		return models.TripSummary{}, err
	}

	// Category breakdown (expenses only)
	type catRow struct {
		CategoryID   string
		CategoryName string
		Icon         string
		Color        string
		TotalAmount  float64
		Count        int
	}
	var catRows []catRow
	err = r.db.Raw(`
		SELECT
			COALESCE(c.id::text, '')          AS category_id,
			COALESCE(c.name, 'Uncategorized') AS category_name,
			COALESCE(c.icon, '')              AS icon,
			COALESCE(c.color, '')             AS color,
			SUM(t.amount)                     AS total_amount,
			COUNT(t.id)                       AS count
		FROM transactions t
		JOIN transaction_trips tt ON tt.transaction_id = t.id
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE tt.trip_id = ? AND t.deleted_at IS NULL AND t.type = 'expense'
		GROUP BY c.id, c.name, c.icon, c.color
		ORDER BY total_amount DESC
	`, tripID).Scan(&catRows).Error
	if err != nil {
		return models.TripSummary{}, err
	}

	breakdown := make([]models.TripCategoryBreakdown, 0, len(catRows))
	for _, row := range catRows {
		pct := 0.0
		if totals.TotalExpense > 0 {
			pct = (row.TotalAmount / totals.TotalExpense) * 100
		}
		breakdown = append(breakdown, models.TripCategoryBreakdown{
			CategoryID:   row.CategoryID,
			CategoryName: row.CategoryName,
			Icon:         row.Icon,
			Color:        row.Color,
			TotalAmount:  row.TotalAmount,
			Percentage:   pct,
			Count:        row.Count,
		})
	}

	// Get trip name
	var trip models.Trip
	r.db.Select("id, name").First(&trip, "id = ?", tripID)

	return models.TripSummary{
		TripID:            tripID.String(),
		TripName:          trip.Name,
		TotalExpense:      totals.TotalExpense,
		TotalIncome:       totals.TotalIncome,
		TransactionCount:  totals.Count,
		CategoryBreakdown: breakdown,
	}, nil
}
