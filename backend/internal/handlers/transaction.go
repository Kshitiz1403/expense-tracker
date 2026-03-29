package handlers

import (
	"encoding/csv"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TransactionHandler struct {
	txRepo  *repository.TransactionRepository
	catRepo *repository.CategoryRepository
}

func NewTransactionHandler(txRepo *repository.TransactionRepository, catRepo *repository.CategoryRepository) *TransactionHandler {
	return &TransactionHandler{
		txRepo:  txRepo,
		catRepo: catRepo,
	}
}

// GetTransactions returns transactions with filters and pagination
// GET /api/transactions?page=1&limit=20&category=xxx&type=income&source=sms
func (h *TransactionHandler) GetTransactions(c *gin.Context) {
	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Get transactions
	transactions, err := h.txRepo.GetAll(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"page":         page,
		"limit":        limit,
	})
}

// GetTransaction returns a single transaction by ID
// GET /api/transactions/:id
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	transaction, err := h.txRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transaction"})
		return
	}

	if transaction == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

// CreateTransaction creates a new manual transaction
// POST /api/transactions
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	var input struct {
		Amount          float64    `json:"amount" binding:"required,gt=0"`
		Type            string     `json:"type" binding:"required,oneof=income expense"`
		Description     string     `json:"description" binding:"required"`
		TransactionDate string     `json:"transaction_date" binding:"required"`
		CategoryID      *uuid.UUID `json:"category_id"`
		Merchant        *string    `json:"merchant"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	transactionDate, err := parseTransactionDate(input.TransactionDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Create transaction
	transaction := &models.Transaction{
		Amount:          input.Amount,
		Type:            input.Type,
		Description:     input.Description,
		TransactionDate: transactionDate,
		CategoryID:      input.CategoryID,
		Merchant:        input.Merchant,
		Source:          "manual",
		RequiresReview:  false,
	}

	if err := h.txRepo.Create(transaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, transaction)
}

// UpdateTransaction updates an existing transaction
// PUT /api/transactions/:id
func (h *TransactionHandler) UpdateTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	// Get existing transaction
	transaction, err := h.txRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transaction"})
		return
	}
	if transaction == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	var input struct {
		Amount          *float64   `json:"amount"`
		Type            *string    `json:"type"`
		Description     *string    `json:"description"`
		TransactionDate *string    `json:"transaction_date"`
		CategoryID      *uuid.UUID `json:"category_id"`
		Merchant        *string    `json:"merchant"`
		Notes           *string    `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if input.Amount != nil {
		transaction.Amount = *input.Amount
	}
	if input.Type != nil {
		transaction.Type = *input.Type
	}
	if input.Description != nil {
		transaction.Description = *input.Description
	}
	if input.TransactionDate != nil {
		date, err := parseTransactionDate(*input.TransactionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
		transaction.TransactionDate = date
	}
	if input.CategoryID != nil {
		transaction.CategoryID = input.CategoryID
	}
	if input.Merchant != nil {
		transaction.Merchant = input.Merchant
	}
	if input.Notes != nil {
		transaction.Notes = input.Notes
	}

	if err := h.txRepo.Update(transaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

// DeleteTransaction deletes a transaction
// DELETE /api/transactions/:id
func (h *TransactionHandler) DeleteTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	if err := h.txRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted successfully"})
}

// GetReviewQueue returns transactions requiring review
// GET /api/transactions/review
func (h *TransactionHandler) GetReviewQueue(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	if limit < 1 || limit > 100 {
		limit = 50
	}

	transactions, err := h.txRepo.GetRequiringReview(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch review queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"count":        len(transactions),
	})
}

// ApproveTransaction approves a transaction (removes from review queue)
// PUT /api/transactions/:id/approve
func (h *TransactionHandler) ApproveTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	// Get transaction
	transaction, err := h.txRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transaction"})
		return
	}
	if transaction == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Approve (remove from review queue)
	transaction.RequiresReview = false

	// Apply AI suggested category if available
	if transaction.AISuggestedCategoryID != nil {
		transaction.CategoryID = transaction.AISuggestedCategoryID
	}

	if err := h.txRepo.Update(transaction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve transaction"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

// ExportTransactions streams a CSV of transactions matching optional filters
// GET /api/transactions/export?type=expense&source=sms&date_from=2026-01-01&date_to=2026-03-31
func (h *TransactionHandler) ExportTransactions(c *gin.Context) {
	filter := repository.TransactionFilter{
		Type:   c.Query("type"),
		Source: c.Query("source"),
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
		// Include the full day
		endOfDay := t.Add(24*time.Hour - time.Second)
		filter.DateTo = &endOfDay
	}

	transactions, err := h.txRepo.GetFiltered(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	filename := fmt.Sprintf("transactions_%s.csv", time.Now().Format("20060102"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"Transaction Date", "Created At", "Description", "Merchant", "Amount", "Type", "Category", "Source", "Notes", "AI Confidence"})

	for _, tx := range transactions {
		merchant := ""
		if tx.Merchant != nil {
			merchant = *tx.Merchant
		}
		category := ""
		if tx.Category != nil {
			category = tx.Category.Name
		}
		notes := ""
		if tx.Notes != nil {
			notes = *tx.Notes
		}
		confidence := ""
		if tx.AIConfidence != nil {
			confidence = fmt.Sprintf("%.0f%%", *tx.AIConfidence*100)
		}

		w.Write([]string{
			tx.TransactionDate.Format("2006-01-02"),
			tx.CreatedAt.Format("2006-01-02 15:04"),
			tx.Description,
			merchant,
			fmt.Sprintf("%.2f", tx.Amount),
			tx.Type,
			category,
			tx.Source,
			notes,
			confidence,
		})
	}

	w.Flush()
}

// Helper function to parse transaction date
func parseTransactionDate(dateStr string) (time.Time, error) {
	// Try multiple formats
	formats := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("invalid date format")
}
