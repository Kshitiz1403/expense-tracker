package repository

import (
	"expense-tracker/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DataSourceRepository struct {
	db *gorm.DB
}

func NewDataSourceRepository(db *gorm.DB) *DataSourceRepository {
	return &DataSourceRepository{db: db}
}

func (r *DataSourceRepository) Create(ds *models.DataSource) error {
	return r.db.Create(ds).Error
}

func (r *DataSourceRepository) List() ([]models.DataSource, error) {
	var sources []models.DataSource
	if err := r.db.Order("created_at desc").Find(&sources).Error; err != nil {
		return nil, err
	}
	return sources, nil
}

func (r *DataSourceRepository) GetByID(id uuid.UUID) (*models.DataSource, error) {
	var ds models.DataSource
	if err := r.db.Where("id = ?", id).First(&ds).Error; err != nil {
		return nil, err
	}
	return &ds, nil
}
