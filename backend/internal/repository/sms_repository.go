package repository

import (
	"expense-tracker/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SMSFilter holds optional filter criteria for browsing SMS messages
type SMSFilter struct {
	Search         string
	DateFrom       *time.Time
	DateTo         *time.Time
	Classification string // "all" | "transaction" | "non-transaction" (default: non-transaction)
}

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

// GetMessages returns processed SMS messages filtered by classification.
// "non-transaction" (default): SMS with no linked transaction
// "transaction": SMS that have a linked transaction
// "all": every processed SMS
func (r *SMSRepository) GetMessages(filter SMSFilter, limit, offset int) ([]models.SMSMessage, int64, error) {
	var messages []models.SMSMessage
	var total int64

	base := r.db.Model(&models.SMSMessage{}).
		Where("sms_messages.processed = ?", true).
		Joins("LEFT JOIN transactions ON transactions.source_id = sms_messages.id AND transactions.deleted_at IS NULL")

	switch filter.Classification {
	case "transaction":
		base = base.Where("transactions.id IS NOT NULL")
	case "non-transaction":
		base = base.Where("transactions.id IS NULL")
	default: // "all" or empty — show everything
	}

	if filter.Search != "" {
		like := "%" + filter.Search + "%"
		base = base.Where("sms_messages.message ILIKE ? OR sms_messages.phone_number ILIKE ?", like, like)
	}
	if filter.DateFrom != nil {
		base = base.Where("sms_messages.received_at >= ?", filter.DateFrom)
	}
	if filter.DateTo != nil {
		base = base.Where("sms_messages.received_at <= ?", filter.DateTo)
	}

	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := base.
		Order("sms_messages.received_at DESC").
		Limit(limit).Offset(offset).
		Find(&messages).Error

	return messages, total, err
}
