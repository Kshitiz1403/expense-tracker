package handlers

import (
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CategoryHandler struct {
	repo *repository.CategoryRepository
}

func NewCategoryHandler(repo *repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{repo: repo}
}

// GetCategories returns all categories
// GET /api/categories
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	categories, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	c.JSON(http.StatusOK, categories)
}

// GetCategory returns a single category by ID
// GET /api/categories/:id
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	category, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
		return
	}

	if category == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, category)
}

// CreateCategory creates a new category
// POST /api/categories
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var input struct {
		Name          string   `json:"name" binding:"required"`
		Type          string   `json:"type" binding:"required,oneof=income expense"`
		Icon          *string  `json:"icon"`
		Color         *string  `json:"color"`
		MonthlyBudget *float64 `json:"monthly_budget"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if category already exists
	existing, err := h.repo.GetByName(input.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing category"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Category already exists"})
		return
	}

	// Create category
	category := &models.Category{
		Name:          input.Name,
		Type:          input.Type,
		Icon:          stringValue(input.Icon),
		Color:         stringValue(input.Color),
		MonthlyBudget: input.MonthlyBudget,
	}

	if err := h.repo.Create(category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// Helper to convert *string to string
func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
