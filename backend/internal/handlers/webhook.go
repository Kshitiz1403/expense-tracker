package handlers

import (
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/services"
	"expense-tracker/internal/workers"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type WebhookHandler struct {
	smsRepo    *repository.SMSRepository
	dsRepo     *repository.DataSourceRepository
	processor  *services.TransactionProcessor
	taskClient *workers.TaskClient
	webhookID  string
}

func NewWebhookHandler(
	smsRepo *repository.SMSRepository,
	dsRepo *repository.DataSourceRepository,
	processor *services.TransactionProcessor,
	taskClient *workers.TaskClient,
	webhookID string,
) *WebhookHandler {
	return &WebhookHandler{
		smsRepo:    smsRepo,
		dsRepo:     dsRepo,
		processor:  processor,
		taskClient: taskClient,
		webhookID:  webhookID,
	}
}

// HandleSMSWebhook processes incoming SMS webhooks from Android SMS Gateway (v1).
func (h *WebhookHandler) HandleSMSWebhook(c *gin.Context) {
	h.handleSMS(c, &androidGatewayProvider{})
}

// HandleSMSWebhookV2 processes incoming SMS webhooks from the v2 provider.
func (h *WebhookHandler) HandleSMSWebhookV2(c *gin.Context) {
	h.handleSMS(c, &v2Provider{})
}

// handleSMS is the shared handler logic used by all provider-specific endpoints.
func (h *WebhookHandler) handleSMS(c *gin.Context, provider SMSWebhookProvider) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	sms, err := provider.Parse(body)
	if err != nil {
		log.Printf("Error parsing webhook payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	// Identify the user from the X-User-ID header embedded in the generated config
	userIDStr := c.GetHeader("X-User-ID")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("Missing or invalid X-User-ID header: %q", userIDStr)
		c.JSON(http.StatusForbidden, gin.H{"error": "Missing or invalid X-User-ID header"})
		return
	}

	// Verify the device is registered to this user
	ds, err := h.dsRepo.GetByDeviceIDAndUser(sms.DeviceID, userID)
	if err != nil {
		log.Printf("Error checking device registration: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if ds == nil {
		log.Printf("Unregistered device %q for user %s", sms.DeviceID, userID)
		c.JSON(http.StatusForbidden, gin.H{"error": "Device not registered for this user"})
		return
	}

	// Idempotency check scoped to user
	existing, err := h.smsRepo.GetByEventID(sms.EventID, userID)
	if err != nil {
		log.Printf("Error checking for duplicate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existing != nil {
		log.Printf("Duplicate webhook received: %s", sms.EventID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Webhook already processed",
			"id":      existing.ID,
		})
		return
	}

	msg := &models.SMSMessage{
		UserID:      userID,
		DeviceID:    sms.DeviceID,
		EventType:   sms.EventType,
		EventID:     sms.EventID,
		WebhookID:   sms.WebhookID,
		Message:     sms.Message,
		PhoneNumber: sms.PhoneNumber,
		SimNumber:   sms.SimNumber,
		MessageID:   sms.MessageID,
		ReceivedAt:  sms.ReceivedAt,
		RawPayload:  string(body),
		IPAddress:   c.ClientIP(),
		Processed:   false,
	}

	if err := h.smsRepo.Create(msg); err != nil {
		log.Printf("Error storing SMS message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store message"})
		return
	}

	log.Printf("SMS webhook received and stored: ID=%s, EventID=%s, From=%s, Message=%s",
		msg.ID, msg.EventID, msg.PhoneNumber, msg.Message[:min(50, len(msg.Message))])

	if err := h.taskClient.EnqueueProcessSMS(c.Request.Context(), msg.ID, userID); err != nil {
		log.Printf("Error enqueueing SMS processing task: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Webhook received successfully",
		"id":      msg.ID,
	})
}
