package handlers

import (
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
	Amount          *float64   `json:"amount"`
	Type            *string    `json:"type"`
	Merchant        *string    `json:"merchant"`
	CategoryID      *uuid.UUID `json:"category_id"`
	CategoryName    *string    `json:"category_name"` // used when category_id is nil
	Description     *string    `json:"description"`
	TransactionDate *string    `json:"transaction_date"`
}

type extractResponse struct {
	Amount      float64    `json:"amount"`
	Type        string     `json:"type"`
	Merchant    string     `json:"merchant"`
	Category    string     `json:"category"`
	CategoryID  *uuid.UUID `json:"categoryId,omitempty"`
	Description string     `json:"description"`
	Confidence  float64    `json:"confidence"`
}

// ExtractSMS calls AI to preview transaction details but does NOT create a transaction.
// POST /api/sms/:id/extract
func (h *SMSHandler) ExtractSMS(c *gin.Context) {
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

	existing, err := h.txRepo.GetBySourceID(smsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A transaction already exists for this SMS"})
		return
	}

	if h.aiService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service is not configured"})
		return
	}

	txData, meta, err := h.aiService.ExtractTransaction(c.Request.Context(), sms.Message)

	// Always record the AI call for audit
	aiCall := &models.AICall{
		SMSID:      &sms.ID,
		Provider:   h.aiService.Provider,
		Model:      h.aiService.Model,
		Prompt:     meta.Prompt,
		DurationMs: meta.DurationMs,
		Success:    err == nil,
	}
	aiCall.RawResponse = meta.RawResponse
	if err != nil {
		errStr := err.Error()
		aiCall.Error = &errStr
		if createErr := h.aiCallRepo.Create(aiCall); createErr != nil {
			log.Printf("Warning: failed to save AI call: %v", createErr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI extraction failed: %v", err)})
		return
	}

	parsedJSON, _ := json.Marshal(txData)
	parsedStr := string(parsedJSON)
	aiCall.ParsedResult = &parsedStr
	if createErr := h.aiCallRepo.Create(aiCall); createErr != nil {
		log.Printf("Warning: failed to save AI call: %v", createErr)
	}

	// Look up existing category — do NOT create if missing
	var categoryID *uuid.UUID
	if txData.Category != "" {
		category, _ := h.catRepo.GetByName(txData.Category)
		if category != nil {
			categoryID = &category.ID
		}
	}

	c.JSON(http.StatusOK, extractResponse{
		Amount:      txData.Amount,
		Type:        txData.Type,
		Merchant:    txData.Merchant,
		Category:    txData.Category,
		CategoryID:  categoryID,
		Description: txData.Description,
		Confidence:  txData.Confidence,
	})
}

// ConvertSMS converts an SMS message into a transaction using manually supplied fields.
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

	transaction, err := h.convertManually(sms, &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.txRepo.Create(transaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	if err := h.smsRepo.MarkAsProcessed(smsID, nil); err != nil {
		log.Printf("Warning: failed to clear processing error for SMS %s: %v", smsID, err)
	}

	log.Printf("SMS %s converted to transaction %s", smsID, transaction.ID)
	c.JSON(http.StatusCreated, transaction)
}

// convertManually builds a transaction from user-supplied fields.
// If CategoryID is nil but CategoryName is set, finds or creates the category.
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

	// Resolve category: use provided ID, or find-or-create by name
	categoryID := input.CategoryID
	if categoryID == nil && input.CategoryName != nil && *input.CategoryName != "" {
		category, _ := h.catRepo.GetByName(*input.CategoryName)
		if category == nil {
			category = &models.Category{Name: *input.CategoryName, Type: *input.Type}
			if err := h.catRepo.Create(category); err != nil {
				log.Printf("Warning: failed to create category %q: %v", *input.CategoryName, err)
				category = nil
			}
		}
		if category != nil {
			categoryID = &category.ID
		}
	}

	confidence := 1.0
	return &models.Transaction{
		Description:     *input.Description,
		Amount:          *input.Amount,
		Type:            *input.Type,
		TransactionDate: txDate,
		CategoryID:      categoryID,
		Merchant:        input.Merchant,
		Source:          "sms",
		SourceID:        &sms.ID,
		AIConfidence:    &confidence,
		RequiresReview:  false,
	}, nil
}
