package repository

import (
	"expense-tracker/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

// GetByName retrieves a category by name (case-insensitive)
func (r *CategoryRepository) GetByName(name string) (*models.Category, error) {
	var category models.Category
	err := r.db.Where("LOWER(name) = LOWER(?)", name).First(&category).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &category, err
}

// GetByID retrieves a category by ID
func (r *CategoryRepository) GetByID(id uuid.UUID) (*models.Category, error) {
	var category models.Category
	err := r.db.First(&category, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &category, err
}

// GetAll retrieves all categories
func (r *CategoryRepository) GetAll() ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Order("type, name").Find(&categories).Error
	return categories, err
}

// Create creates a new category
func (r *CategoryRepository) Create(category *models.Category) error {
	return r.db.Create(category).Error
}
