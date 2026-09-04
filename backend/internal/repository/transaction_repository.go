package repository

import (
	"expense-tracker/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransactionFilter holds optional filter criteria for querying transactions
type TransactionFilter struct {
	Type       string
	Source     string
	CategoryID string
	Search     string
	DateFrom   *time.Time
	DateTo     *time.Time
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

// GetByID retrieves a transaction by ID scoped to a user
func (r *TransactionRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Transaction, error) {
	var tx models.Transaction
	err := r.db.Preload("Category").Preload("AISuggestedCategory").Preload("SourceMessage").
		First(&tx, "id = ? AND user_id = ?", id, userID).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &tx, err
}

// GetRequiringReview retrieves transactions needing manual review for a user
func (r *TransactionRepository) GetRequiringReview(userID uuid.UUID, limit int) ([]models.Transaction, error) {
	var transactions []models.Transaction
	err := r.db.Preload("Category").
		Preload("AISuggestedCategory").
		Where("requires_review = ? AND user_id = ?", true, userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&transactions).Error
	return transactions, err
}

// Update updates a transaction
func (r *TransactionRepository) Update(tx *models.Transaction) error {
	tx.Category = nil
	tx.AISuggestedCategory = nil
	tx.SourceMessage = nil
	return r.db.Save(tx).Error
}

// Delete soft-deletes a transaction scoped to a user
func (r *TransactionRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Transaction{}).Error
}

// GetAllFiltered retrieves transactions with filters, pagination, and total count for a user
func (r *TransactionRepository) GetAllFiltered(f TransactionFilter, userID uuid.UUID, limit, offset int) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	base := r.db.Model(&models.Transaction{}).Where("user_id = ?", userID)
	if f.Type != "" {
		base = base.Where("type = ?", f.Type)
	}
	if f.Source != "" {
		base = base.Where("source = ?", f.Source)
	}
	if f.CategoryID != "" {
		base = base.Where("category_id = ?", f.CategoryID)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		base = base.Where("description ILIKE ? OR merchant ILIKE ?", like, like)
	}
	if f.DateFrom != nil {
		base = base.Where("transaction_date >= ?", f.DateFrom)
	}
	if f.DateTo != nil {
		base = base.Where("transaction_date <= ?", f.DateTo)
	}

	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := base.Preload("Category").
		Order("transaction_date DESC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&transactions).Error
	return transactions, total, err
}

// GetFiltered retrieves all transactions matching the given filters for a user (no pagination)
func (r *TransactionRepository) GetFiltered(f TransactionFilter, userID uuid.UUID) ([]models.Transaction, error) {
	var transactions []models.Transaction
	q := r.db.Preload("Category").Order("transaction_date DESC, created_at DESC").Where("user_id = ?", userID)
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

// GetBySourceID retrieves a transaction by source (SMS) ID — internal use by worker
func (r *TransactionRepository) GetBySourceID(sourceID uuid.UUID) (*models.Transaction, error) {
	var tx models.Transaction
	err := r.db.First(&tx, "source_id = ?", sourceID).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &tx, err
}
