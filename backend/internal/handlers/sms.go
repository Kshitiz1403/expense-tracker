package handlers

import (
	"context"
	"encoding/json"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/services"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SMSHandler struct {
	smsRepo    *repository.SMSRepository
	txRepo     *repository.TransactionRepository
	catRepo    *repository.CategoryRepository
	aiCallRepo *repository.AICallRepository
	aiService  *services.AIService
}

func NewSMSHandler(
	smsRepo *repository.SMSRepository,
	txRepo *repository.TransactionRepository,
	catRepo *repository.CategoryRepository,
	aiCallRepo *repository.AICallRepository,
	aiService *services.AIService,
) *SMSHandler {
	return &SMSHandler{
		smsRepo:    smsRepo,
		txRepo:     txRepo,
		catRepo:    catRepo,
		aiCallRepo: aiCallRepo,
		aiService:  aiService,
	}
}

// ListSMS returns processed SMS messages filtered by classification
// GET /api/sms?page=1&limit=20&search=&date_from=&date_to=&classification=non-transaction
func (h *SMSHandler) ListSMS(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	filter := repository.SMSFilter{
		Search:         c.Query("search"),
		Classification: c.Query("classification"),
	}

	if from := c.Query("date_from"); from != "" {
		t, err := time.Parse("2006-01-02", from)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date_from format, use YYYY-MM-DD"})
			return
		}
		filter.DateFrom = &t
	}
	if to := c.Query("date_to"); to != "" {
		t, err := time.Parse("2006-01-02", to)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date_to format, use YYYY-MM-DD"})
			return
		}
		endOfDay := t.Add(24*time.Hour - time.Second)
		filter.DateTo = &endOfDay
	}

	messages, total, err := h.smsRepo.GetMessages(filter, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch SMS messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

type convertSMSInput struct {
	UseAI           bool       `json:"use_ai"`
	Amount          *float64   `json:"amount"`
	Type            *string    `json:"type"`
	Merchant        *string    `json:"merchant"`
	CategoryID      *uuid.UUID `json:"category_id"`
	Description     *string    `json:"description"`
	TransactionDate *string    `json:"transaction_date"`
}

// ConvertSMS converts an SMS message into a transaction (via AI or manually)
// POST /api/sms/:id/convert
func (h *SMSHandler) ConvertSMS(c *gin.Context) {
	idStr := c.Param("id")
	smsID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid SMS ID"})
		return
	}

	sms, err := h.smsRepo.GetByID(smsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch SMS"})
		return
	}
	if sms == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "SMS not found"})
		return
	}

	// Prevent double-conversion
	existing, err := h.txRepo.GetBySourceID(smsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A transaction already exists for this SMS"})
		return
	}

	var input convertSMSInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var transaction *models.Transaction
	var aiCall *models.AICall

	if input.UseAI {
		transaction, aiCall, err = h.convertViaAI(c.Request.Context(), sms)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI extraction failed: %v", err)})
			return
		}
	} else {
		transaction, err = h.convertManually(sms, &input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if err := h.txRepo.Create(transaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	// Link the AI call to the newly created transaction and persist it
	if aiCall != nil {
		aiCall.TransactionID = &transaction.ID
		if err := h.aiCallRepo.Create(aiCall); err != nil {
			log.Printf("Warning: failed to save AI call record for transaction %s: %v", transaction.ID, err)
		}
	}

	// Clear processing error now that we've successfully converted it
	if err := h.smsRepo.MarkAsProcessed(smsID, nil); err != nil {
		log.Printf("Warning: failed to clear processing error for SMS %s: %v", smsID, err)
	}

	log.Printf("SMS %s manually converted to transaction %s", smsID, transaction.ID)
	c.JSON(http.StatusCreated, transaction)
}

// convertViaAI calls the AI service to extract transaction details from the SMS
func (h *SMSHandler) convertViaAI(ctx context.Context, sms *models.SMSMessage) (*models.Transaction, *models.AICall, error) {
	if h.aiService == nil {
		return nil, nil, fmt.Errorf("AI service is not configured — use manual conversion instead")
	}

	txData, meta, err := h.aiService.ExtractTransaction(ctx, sms.Message)

	// Build the AICall record (will be persisted after transaction is created)
	aiCall := &models.AICall{
		SMSID:    &sms.ID,
		Provider: h.aiService.Provider,
		Model:    h.aiService.Model,
		Prompt:   meta.Prompt,
		DurationMs: meta.DurationMs,
		Success:  err == nil,
	}
	aiCall.RawResponse = meta.RawResponse

	if err != nil {
		errStr := err.Error()
		aiCall.Error = &errStr
		// Persist the failed call for audit, but don't link a transaction
		if createErr := h.aiCallRepo.Create(aiCall); createErr != nil {
			log.Printf("Warning: failed to save failed AI call: %v", createErr)
		}
		return nil, nil, err
	}

	parsedJSON, _ := json.Marshal(txData)
	parsedStr := string(parsedJSON)
	aiCall.ParsedResult = &parsedStr

	// Resolve or create the suggested category
	var categoryID *uuid.UUID
	if txData.Category != "" {
		category, _ := h.catRepo.GetByName(txData.Category)
		if category == nil {
			category = &models.Category{Name: txData.Category, Type: txData.Type}
			if createErr := h.catRepo.Create(category); createErr != nil {
				log.Printf("Warning: failed to create category %q: %v", txData.Category, createErr)
				category = nil
			}
		}
		if category != nil {
			categoryID = &category.ID
		}
	}

	requiresReview := txData.Confidence < 0.9

	metadata, _ := json.Marshal(map[string]interface{}{
		"ai_category":    txData.Category,
		"ai_description": txData.Description,
	})
	metadataStr := string(metadata)

	transaction := &models.Transaction{
		Description:           txData.Description,
		Amount:                txData.Amount,
		Type:                  txData.Type,
		TransactionDate:       sms.ReceivedAt,
		CategoryID:            categoryID,
		Merchant:              &txData.Merchant,
		Source:                "sms",
		SourceID:              &sms.ID,
		AIConfidence:          &txData.Confidence,
		AISuggestedCategoryID: categoryID,
		RequiresReview:        requiresReview,
		AIMetadata:            &metadataStr,
	}

	return transaction, aiCall, nil
}

// convertManually builds a transaction from user-supplied fields
func (h *SMSHandler) convertManually(sms *models.SMSMessage, input *convertSMSInput) (*models.Transaction, error) {
	if input.Amount == nil || *input.Amount <= 0 {
		return nil, fmt.Errorf("amount is required and must be positive")
	}
	if input.Type == nil || (*input.Type != "income" && *input.Type != "expense") {
		return nil, fmt.Errorf("type must be 'income' or 'expense'")
	}
	if input.Description == nil || *input.Description == "" {
		return nil, fmt.Errorf("description is required")
	}

	txDate := sms.ReceivedAt
	if input.TransactionDate != nil && *input.TransactionDate != "" {
		parsed, err := parseTransactionDate(*input.TransactionDate)
		if err != nil {
			return nil, fmt.Errorf("invalid transaction_date format")
		}
		txDate = parsed
	}

	confidence := 1.0
	return &models.Transaction{
		Description:     *input.Description,
		Amount:          *input.Amount,
		Type:            *input.Type,
		TransactionDate: txDate,
		CategoryID:      input.CategoryID,
		Merchant:        input.Merchant,
		Source:          "sms",
		SourceID:        &sms.ID,
		AIConfidence:    &confidence,
		RequiresReview:  false,
	}, nil
}
