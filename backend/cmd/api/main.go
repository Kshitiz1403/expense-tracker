package main

import (
	"fmt"
	"log"

	"expense-tracker/internal/config"
	"expense-tracker/internal/handlers"
	"expense-tracker/internal/middleware"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/services"
	"expense-tracker/internal/workers"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database
	db, err := initDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.DataSource{},
		&models.Category{},
		&models.SMSMessage{},
		&models.Transaction{},
		&models.AICall{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database migrated successfully")

	// Seed default categories
	if err := repository.SeedDefaultCategories(db); err != nil {
		log.Printf("Warning: Failed to seed categories: %v", err)
	}

	// Initialize repositories
	smsRepo := repository.NewSMSRepository(db)
	txRepo := repository.NewTransactionRepository(db)
	catRepo := repository.NewCategoryRepository(db)
	aiCallRepo := repository.NewAICallRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)

	// Initialize services
	smsParser := services.NewSMSParser()

	// Initialize AI service (skip if no API key)
	var aiService *services.AIService
	var processor *services.TransactionProcessor

	if cfg.LLM.APIKey != "" {
		var err error
		aiService, err = services.NewAIService(cfg.LLM.Provider, cfg.LLM.APIKey, cfg.LLM.Model)
		if err != nil {
			log.Printf("Warning: Failed to initialize AI service: %v", err)
			log.Println("Transactions will be stored without AI extraction")
		} else {
			log.Printf("AI service initialized: provider=%s, model=%s", cfg.LLM.Provider, cfg.LLM.Model)
			// Create transaction processor with 0.9 confidence threshold
			processor = services.NewTransactionProcessor(smsParser, aiService, txRepo, catRepo, smsRepo, aiCallRepo, 0.9)
		}
	} else {
		log.Println("No LLM_API_KEY configured - AI extraction disabled")
	}

	// Initialize asynq task client
	taskClient, err := workers.NewTaskClient(cfg.Redis.Addr)
	if err != nil {
		log.Fatalf("Failed to create task client: %v", err)
	}
	defer taskClient.Close()

	// Initialize asynq worker server
	workerServer := workers.NewServer(cfg, processor)

	// Start worker in background
	go func() {
		if err := workerServer.Start(); err != nil {
			log.Fatalf("Failed to start worker server: %v", err)
		}
	}()
	defer workerServer.Stop()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(&cfg.Auth)
	webhookHandler := handlers.NewWebhookHandler(smsRepo, processor, taskClient, cfg.SMS.WebhookID)
	categoryHandler := handlers.NewCategoryHandler(catRepo)
	transactionHandler := handlers.NewTransactionHandler(txRepo, catRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsRepo)

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.Frontend.URL)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Expense Tracker API is running",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Public: auth
		api.POST("/auth/login", authHandler.Login)

		// Public: SMS webhook (has its own secret-based verification)
		api.POST("/webhooks/sms", webhookHandler.HandleSMSWebhook)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.JWTAuth(cfg.Auth.JWTSecret))
		{
			protected.GET("/ping", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "pong"})
			})

			// Categories
			categories := protected.Group("/categories")
			{
				categories.GET("", categoryHandler.GetCategories)
				categories.GET("/:id", categoryHandler.GetCategory)
				categories.POST("", categoryHandler.CreateCategory)
			}

			// Transactions
			transactions := protected.Group("/transactions")
			{
				transactions.GET("", transactionHandler.GetTransactions)
				transactions.GET("/export", transactionHandler.ExportTransactions)
				transactions.GET("/review", transactionHandler.GetReviewQueue)
				transactions.GET("/:id", transactionHandler.GetTransaction)
				transactions.POST("", transactionHandler.CreateTransaction)
				transactions.PUT("/:id", transactionHandler.UpdateTransaction)
				transactions.PUT("/:id/approve", transactionHandler.ApproveTransaction)
				transactions.DELETE("/:id", transactionHandler.DeleteTransaction)
			}

			// Analytics
			analytics := protected.Group("/analytics")
			{
				analytics.GET("/summary", analyticsHandler.GetSummary)
			}
		}
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Starting server on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func initDatabase(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established")
	return db, nil
}
