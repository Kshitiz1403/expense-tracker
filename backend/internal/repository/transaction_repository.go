package repository

import (
	"expense-tracker/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransactionFilter holds optional filter criteria for querying transactions
type TransactionFilter struct {
	Type     string
	Source   string
	DateFrom *time.Time
	DateTo   *time.Time
}

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// Create stores a new transaction
func (r *TransactionRepository) Create(tx *models.Transaction) error {
	return r.db.Create(tx).Error
}

// GetByID retrieves a transaction by ID
func (r *TransactionRepository) GetByID(id uuid.UUID) (*models.Transaction, error) {
	var tx models.Transaction
	err := r.db.Preload("Category").Preload("AISuggestedCategory").Preload("SourceMessage").First(&tx, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &tx, err
}

// GetAll retrieves all transactions with pagination
func (r *TransactionRepository) GetAll(limit, offset int) ([]models.Transaction, error) {
	var transactions []models.Transaction
	err := r.db.Preload("Category").
		Order("transaction_date DESC, created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&transactions).Error
	return transactions, err
}

// GetRequiringReview retrieves transactions that need manual review
func (r *TransactionRepository) GetRequiringReview(limit int) ([]models.Transaction, error) {
	var transactions []models.Transaction
	err := r.db.Preload("Category").
		Preload("AISuggestedCategory").
		Where("requires_review = ?", true).
		Order("created_at DESC").
		Limit(limit).
		Find(&transactions).Error
	return transactions, err
}

// Update updates a transaction
func (r *TransactionRepository) Update(tx *models.Transaction) error {
	// Nil out preloaded associations so GORM uses the FK fields directly
	// instead of reconciling category_id from the loaded Category struct.
	tx.Category = nil
	tx.AISuggestedCategory = nil
	tx.SourceMessage = nil
	return r.db.Save(tx).Error
}

// Delete deletes a transaction
func (r *TransactionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Transaction{}, "id = ?", id).Error
}

// GetFiltered retrieves all transactions matching the given filters (no pagination)
func (r *TransactionRepository) GetFiltered(f TransactionFilter) ([]models.Transaction, error) {
	var transactions []models.Transaction
	q := r.db.Preload("Category").Order("transaction_date DESC, created_at DESC")
	if f.Type != "" {
		q = q.Where("type = ?", f.Type)
	}
	if f.Source != "" {
		q = q.Where("source = ?", f.Source)
	}
	if f.DateFrom != nil {
		q = q.Where("transaction_date >= ?", f.DateFrom)
	}
	if f.DateTo != nil {
		q = q.Where("transaction_date <= ?", f.DateTo)
	}
	err := q.Find(&transactions).Error
	return transactions, err
}

// GetBySourceID retrieves transaction by source (SMS) ID
func (r *TransactionRepository) GetBySourceID(sourceID uuid.UUID) (*models.Transaction, error) {
	var tx models.Transaction
	err := r.db.First(&tx, "source_id = ?", sourceID).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &tx, err
}
