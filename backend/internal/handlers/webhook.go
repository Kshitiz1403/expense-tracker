package handlers

import (
	"context"
	"encoding/json"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/services"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type WebhookHandler struct {
	smsRepo   *repository.SMSRepository
	processor *services.TransactionProcessor
	webhookID string
}

func NewWebhookHandler(
	smsRepo *repository.SMSRepository,
	processor *services.TransactionProcessor,
	webhookID string,
) *WebhookHandler {
	return &WebhookHandler{
		smsRepo:   smsRepo,
		processor: processor,
		webhookID: webhookID,
	}
}

// SMSWebhook payload structures
type SMSWebhookPayload struct {
	DeviceID  string     `json:"deviceId"`
	Event     string     `json:"event"`
	ID        string     `json:"id"`
	Payload   SMSPayload `json:"payload"`
	WebhookID string     `json:"webhookId"`
}

type SMSPayload struct {
	Message     string `json:"message"`
	ReceivedAt  string `json:"receivedAt"`
	MessageID   string `json:"messageId"`
	PhoneNumber string `json:"phoneNumber"`
	SimNumber   int    `json:"simNumber"`
}

// HandleSMSWebhook processes incoming SMS webhooks from Android SMS Gateway
func (h *WebhookHandler) HandleSMSWebhook(c *gin.Context) {
	// Read body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse payload
	var webhook SMSWebhookPayload
	if err := json.Unmarshal(body, &webhook); err != nil {
		log.Printf("Error parsing webhook payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	// Check for duplicate (idempotency)
	existing, err := h.smsRepo.GetByEventID(webhook.ID)
	if err != nil {
		log.Printf("Error checking for duplicate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existing != nil {
		log.Printf("Duplicate webhook received: %s", webhook.ID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Webhook already processed",
			"id":      existing.ID,
		})
		return
	}

	// Parse received timestamp
	receivedAt, err := time.Parse(time.RFC3339, webhook.Payload.ReceivedAt)
	if err != nil {
		log.Printf("Error parsing receivedAt timestamp: %v", err)
		receivedAt = time.Now()
	}

	// Create SMS message record
	smsMessage := &models.SMSMessage{
		DeviceID:    webhook.DeviceID,
		EventType:   webhook.Event,
		EventID:     webhook.ID,
		WebhookID:   webhook.WebhookID,
		Message:     webhook.Payload.Message,
		PhoneNumber: webhook.Payload.PhoneNumber,
		SimNumber:   webhook.Payload.SimNumber,
		MessageID:   webhook.Payload.MessageID,
		ReceivedAt:  receivedAt,
		RawPayload:  string(body),
		IPAddress:   c.ClientIP(),
		Processed:   false,
	}

	// Store in database
	if err := h.smsRepo.Create(smsMessage); err != nil {
		log.Printf("Error storing SMS message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store message"})
		return
	}

	log.Printf("SMS webhook received and stored: ID=%s, EventID=%s, From=%s, Message=%s",
		smsMessage.ID, smsMessage.EventID, smsMessage.PhoneNumber, smsMessage.Message[:min(50, len(smsMessage.Message))])

	// Process SMS asynchronously (in background)
	go func() {
		ctx := context.Background()
		if err := h.processor.ProcessSMS(ctx, smsMessage.ID); err != nil {
			log.Printf("Error processing SMS %s: %v", smsMessage.ID, err)
		}
	}()

	// Return success immediately
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Webhook received successfully",
		"id":      smsMessage.ID,
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
