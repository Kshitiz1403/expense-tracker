package handlers

import (
	"net/http"
	"strconv"
	"time"

	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TripHandler struct {
	tripRepo *repository.TripRepository
}

func NewTripHandler(repo *repository.TripRepository) *TripHandler {
	return &TripHandler{tripRepo: repo}
}

// GET /api/trips
func (h *TripHandler) ListTrips(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	trips, total, err := h.tripRepo.GetAll(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trips"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trips": trips,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GET /api/trips/:id
func (h *TripHandler) GetTrip(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	trip, err := h.tripRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip"})
		return
	}
	if trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}

	c.JSON(http.StatusOK, trip)
}

type createTripInput struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	StartDate   string  `json:"start_date" binding:"required"`
	EndDate     string  `json:"end_date" binding:"required"`
}

// POST /api/trips
func (h *TripHandler) CreateTrip(c *gin.Context) {
	var input createTripInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
		return
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
		return
	}
	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be on or after start_date"})
		return
	}

	trip := &models.Trip{
		Name:        input.Name,
		Description: input.Description,
		StartDate:   startDate,
		EndDate:     endDate,
	}

	if err := h.tripRepo.Create(trip); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trip"})
		return
	}

	c.JSON(http.StatusCreated, trip)
}

type updateTripInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	StartDate   *string `json:"start_date"`
	EndDate     *string `json:"end_date"`
}

// PUT /api/trips/:id
func (h *TripHandler) UpdateTrip(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	trip, err := h.tripRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip"})
		return
	}
	if trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}

	var input updateTripInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != nil {
		trip.Name = *input.Name
	}
	if input.Description != nil {
		trip.Description = input.Description
	}
	if input.StartDate != nil {
		parsed, err := time.Parse("2006-01-02", *input.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
			return
		}
		trip.StartDate = parsed
	}
	if input.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
			return
		}
		trip.EndDate = parsed
	}

	if trip.EndDate.Before(trip.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be on or after start_date"})
		return
	}

	if err := h.tripRepo.Update(trip); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update trip"})
		return
	}

	c.JSON(http.StatusOK, trip)
}

// DELETE /api/trips/:id
func (h *TripHandler) DeleteTrip(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	trip, err := h.tripRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip"})
		return
	}
	if trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}

	if err := h.tripRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete trip"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Trip deleted successfully"})
}

// GET /api/trips/:id/transactions
func (h *TripHandler) GetTripTransactions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	trip, err := h.tripRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip"})
		return
	}
	if trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	transactions, total, err := h.tripRepo.GetTransactions(id, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

type addTransactionInput struct {
	TransactionID string `json:"transaction_id" binding:"required"`
}

// POST /api/trips/:id/transactions
func (h *TripHandler) AddTransactionToTrip(c *gin.Context) {
	tripID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	var input addTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	transactionID, err := uuid.Parse(input.TransactionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction_id"})
		return
	}

	if err := h.tripRepo.AddTransaction(tripID, transactionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add transaction to trip"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction added to trip"})
}

// DELETE /api/trips/:id/transactions/:tx_id
func (h *TripHandler) RemoveTransactionFromTrip(c *gin.Context) {
	tripID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	transactionID, err := uuid.Parse(c.Param("tx_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	if err := h.tripRepo.RemoveTransaction(tripID, transactionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove transaction from trip"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction removed from trip"})
}

// GET /api/trips/:id/summary
func (h *TripHandler) GetTripSummary(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	trip, err := h.tripRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip"})
		return
	}
	if trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}

	summary, err := h.tripRepo.GetTripSummary(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}
