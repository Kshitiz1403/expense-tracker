package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DataSource struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Type      string          `gorm:"type:varchar(50);not null" json:"type"` // sms, email, bank_statement, manual
	Name      string          `gorm:"type:varchar(255);not null" json:"name"`
	Status    string          `gorm:"type:varchar(50);not null" json:"status"` // connected, disconnected, syncing
	LastSync  *time.Time      `json:"lastSync"`
	Config    *gorm.DeletedAt `gorm:"type:jsonb" json:"config"` // Store source-specific config as JSON
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type Category struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name          string    `gorm:"type:varchar(255);not null" json:"name"`
	Type          string    `gorm:"type:varchar(50);not null" json:"type"` // income, expense
	Icon          string    `gorm:"type:varchar(10)" json:"icon"`          // Emoji
	Color         string    `gorm:"type:varchar(50)" json:"color"`
	MonthlyBudget *float64  `gorm:"type:decimal(15,2)" json:"monthlyBudget"`
	IsSystem      bool      `gorm:"default:false" json:"isSystem"` // System categories can't be deleted
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type SMSMessage struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	DeviceID        string    `gorm:"type:varchar(255);not null" json:"deviceId"`
	EventType       string    `gorm:"type:varchar(100);not null" json:"eventType"`
	EventID         string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"eventId"`
	WebhookID       string    `gorm:"type:varchar(255)" json:"webhookId"`
	Message         string    `gorm:"type:text;not null" json:"message"`
	PhoneNumber     string    `gorm:"type:varchar(50);not null;index" json:"phoneNumber"`
	SimNumber       int       `json:"simNumber"`
	MessageID       string    `gorm:"type:varchar(255)" json:"messageId"`
	ReceivedAt      time.Time `gorm:"not null" json:"receivedAt"`
	RawPayload      string    `gorm:"type:jsonb;not null" json:"rawPayload"` // Store entire webhook
	IPAddress       string    `gorm:"type:varchar(50)" json:"ipAddress"`
	Signature       string    `gorm:"type:varchar(255)" json:"signature"`
	SignatureValid  bool      `gorm:"default:false" json:"signatureValid"`
	Processed       bool      `gorm:"default:false;index" json:"processed"`
	ProcessingError *string   `gorm:"type:text" json:"processingError"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Transaction struct {
	ID                    uuid.UUID   `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Description           string      `gorm:"type:text;not null" json:"description"`
	Amount                float64     `gorm:"type:decimal(15,2);not null" json:"amount"`
	Type                  string      `gorm:"type:varchar(50);not null" json:"type"` // income, expense
	TransactionDate       time.Time   `gorm:"not null;index" json:"transactionDate"`
	CategoryID            *uuid.UUID  `gorm:"type:uuid;index" json:"categoryId"`
	Category              *Category   `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Merchant              *string     `gorm:"type:varchar(255)" json:"merchant"`
	Tags                  []string    `gorm:"type:text[]" json:"tags"`
	Source                string      `gorm:"type:varchar(50);not null;index" json:"source"` // sms, email, bank_statement, manual
	SourceID              *uuid.UUID  `gorm:"type:uuid;index" json:"sourceId"`               // Reference to sms_messages.id
	SourceMessage         *SMSMessage `gorm:"foreignKey:SourceID" json:"sourceMessage,omitempty"`
	AIConfidence          *float64   `gorm:"type:decimal(3,2)" json:"aiConfidence"`         // 0.00 to 1.00
	AISuggestedCategoryID *uuid.UUID `gorm:"type:uuid" json:"aiSuggestedCategoryId"`
	AISuggestedCategory   *Category  `gorm:"foreignKey:AISuggestedCategoryID" json:"aiSuggestedCategory,omitempty"`
	AIMetadata            *string    `gorm:"type:jsonb" json:"aiMetadata"`
	RequiresReview        bool       `gorm:"default:false;index" json:"requiresReview"`
	ReviewedAt            *time.Time `json:"reviewedAt"`
	Notes                 *string        `gorm:"type:text" json:"notes"`
	CreatedAt             time.Time      `json:"createdAt"`
	UpdatedAt             time.Time      `json:"updatedAt"`
	DeletedAt             gorm.DeletedAt `gorm:"index" json:"-"`
}

type AICall struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	SMSID         *uuid.UUID `gorm:"type:uuid;index" json:"smsId"`
	TransactionID *uuid.UUID `gorm:"type:uuid;index" json:"transactionId"`
	Provider      string     `gorm:"type:varchar(50);not null" json:"provider"`
	Model         string     `gorm:"type:varchar(100);not null" json:"model"`
	Prompt        string     `gorm:"type:text;not null" json:"prompt"`
	RawResponse   string     `gorm:"type:text" json:"rawResponse"`
	ParsedResult  *string    `gorm:"type:jsonb" json:"parsedResult"`
	Success       bool       `gorm:"default:false" json:"success"`
	Error         *string    `gorm:"type:text" json:"error"`
	DurationMs    int64      `gorm:"not null" json:"durationMs"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type Trip struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Description  *string        `gorm:"type:text" json:"description"`
	StartDate    time.Time      `gorm:"not null" json:"startDate"`
	EndDate      time.Time      `gorm:"not null" json:"endDate"`
	Transactions []Transaction  `gorm:"many2many:transaction_trips;" json:"transactions,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type TransactionTrip struct {
	TripID        uuid.UUID `gorm:"type:uuid;primary_key" json:"tripId"`
	TransactionID uuid.UUID `gorm:"type:uuid;primary_key" json:"transactionId"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (TransactionTrip) TableName() string { return "transaction_trips" }

// BeforeCreate hook to set UUID
func (d *DataSource) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (s *SMSMessage) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (a *AICall) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (t *Trip) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
