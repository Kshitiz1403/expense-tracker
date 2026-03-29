package repository

import (
	"expense-tracker/internal/models"

	"gorm.io/gorm"
)

type AICallRepository struct {
	db *gorm.DB
}

func NewAICallRepository(db *gorm.DB) *AICallRepository {
	return &AICallRepository{db: db}
}

func (r *AICallRepository) Create(call *models.AICall) error {
	return r.db.Create(call).Error
}
