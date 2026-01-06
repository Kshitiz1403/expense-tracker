package repository

import (
	"expense-tracker/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SMSRepository struct {
	db *gorm.DB
}

func NewSMSRepository(db *gorm.DB) *SMSRepository {
	return &SMSRepository{db: db}
}

// Create stores a new SMS message
func (r *SMSRepository) Create(sms *models.SMSMessage) error {
	return r.db.Create(sms).Error
}

// GetByEventID retrieves an SMS by event ID (for idempotency)
func (r *SMSRepository) GetByEventID(eventID string) (*models.SMSMessage, error) {
	var sms models.SMSMessage
	err := r.db.Where("event_id = ?", eventID).First(&sms).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sms, err
}

// GetByID retrieves an SMS by ID
func (r *SMSRepository) GetByID(id uuid.UUID) (*models.SMSMessage, error) {
	var sms models.SMSMessage
	err := r.db.First(&sms, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sms, err
}

// MarkAsProcessed updates the SMS as processed
func (r *SMSRepository) MarkAsProcessed(id uuid.UUID, processingError *string) error {
	updates := map[string]interface{}{
		"processed": true,
	}
	if processingError != nil {
		updates["processing_error"] = *processingError
	}
	return r.db.Model(&models.SMSMessage{}).Where("id = ?", id).Updates(updates).Error
}

// GetUnprocessed retrieves all unprocessed SMS messages
func (r *SMSRepository) GetUnprocessed(limit int) ([]models.SMSMessage, error) {
	var messages []models.SMSMessage
	err := r.db.Where("processed = ?", false).
		Order("received_at ASC").
		Limit(limit).
		Find(&messages).Error
	return messages, err
}
