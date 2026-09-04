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

func (r *DataSourceRepository) List(userID uuid.UUID) ([]models.DataSource, error) {
	var sources []models.DataSource
	if err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&sources).Error; err != nil {
		return nil, err
	}
	return sources, nil
}

func (r *DataSourceRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.DataSource, error) {
	var ds models.DataSource
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&ds).Error; err != nil {
		return nil, err
	}
	return &ds, nil
}

// GetByDeviceIDAndUser looks up a registered SMS data source by device ID for a specific user.
// Used by the webhook handler to verify the device belongs to the user identified by X-User-ID.
func (r *DataSourceRepository) GetByDeviceIDAndUser(deviceID string, userID uuid.UUID) (*models.DataSource, error) {
	var ds models.DataSource
	err := r.db.Where("type = 'sms' AND name = ? AND user_id = ?", deviceID, userID).First(&ds).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &ds, err
}
