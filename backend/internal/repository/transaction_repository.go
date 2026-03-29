package repository

import (
	"expense-tracker/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
	err := r.db.Preload("Category").Preload("AISuggestedCategory").First(&tx, "id = ?", id).Error
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
	return r.db.Save(tx).Error
}

// Delete deletes a transaction
func (r *TransactionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Transaction{}, "id = ?", id).Error
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
