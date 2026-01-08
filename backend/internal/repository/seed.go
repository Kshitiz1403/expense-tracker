package repository

import (
	"expense-tracker/internal/models"
	"log"

	"gorm.io/gorm"
)

// SeedDefaultCategories creates default categories if they don't exist
func SeedDefaultCategories(db *gorm.DB) error {
	categories := []models.Category{
		// Income Categories
		{Name: "Salary", Type: "income", Icon: "💼", Color: "#10B981", IsSystem: true},
		{Name: "Freelance", Type: "income", Icon: "💻", Color: "#059669", IsSystem: true},
		{Name: "Investment", Type: "income", Icon: "📈", Color: "#14B8A6", IsSystem: true},
		{Name: "Business", Type: "income", Icon: "🏢", Color: "#0D9488", IsSystem: true},
		{Name: "Other Income", Type: "income", Icon: "💰", Color: "#84CC16", IsSystem: true},

		// Expense Categories
		{Name: "Groceries", Type: "expense", Icon: "🛒", Color: "#F59E0B", MonthlyBudget: floatPtr(5000), IsSystem: true},
		{Name: "Dining", Type: "expense", Icon: "🍽️", Color: "#EC4899", MonthlyBudget: floatPtr(3000), IsSystem: true},
		{Name: "Transport", Type: "expense", Icon: "🚗", Color: "#06B6D4", MonthlyBudget: floatPtr(2000), IsSystem: true},
		{Name: "Shopping", Type: "expense", Icon: "🛍️", Color: "#8B5CF6", MonthlyBudget: floatPtr(4000), IsSystem: true},
		{Name: "Utilities", Type: "expense", Icon: "⚡", Color: "#3B82F6", MonthlyBudget: floatPtr(2500), IsSystem: true},
		{Name: "Healthcare", Type: "expense", Icon: "🏥", Color: "#EF4444", MonthlyBudget: floatPtr(3000), IsSystem: true},
		{Name: "Entertainment", Type: "expense", Icon: "🎬", Color: "#6366F1", MonthlyBudget: floatPtr(2000), IsSystem: true},
		{Name: "Education", Type: "expense", Icon: "📚", Color: "#A855F7", MonthlyBudget: floatPtr(5000), IsSystem: true},
		{Name: "Bills", Type: "expense", Icon: "📄", Color: "#F97316", MonthlyBudget: floatPtr(3000), IsSystem: true},
		{Name: "Rent", Type: "expense", Icon: "🏠", Color: "#DC2626", MonthlyBudget: floatPtr(15000), IsSystem: true},
		{Name: "Travel", Type: "expense", Icon: "✈️", Color: "#0EA5E9", MonthlyBudget: floatPtr(5000), IsSystem: true},
		{Name: "Personal Care", Type: "expense", Icon: "💅", Color: "#EC4899", MonthlyBudget: floatPtr(1500), IsSystem: true},
		{Name: "Other Expense", Type: "expense", Icon: "💸", Color: "#64748B", IsSystem: true},
	}

	created := 0
	for _, category := range categories {
		var existing models.Category
		result := db.Where("name = ? AND type = ?", category.Name, category.Type).First(&existing)

		if result.Error == gorm.ErrRecordNotFound {
			if err := db.Create(&category).Error; err != nil {
				log.Printf("Failed to create category %s: %v", category.Name, err)
			} else {
				created++
			}
		}
	}

	if created > 0 {
		log.Printf("Seeded %d default categories", created)
	}

	return nil
}

func floatPtr(f float64) *float64 {
	return &f
}
