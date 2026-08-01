package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"expense-tracker/internal/config"
	"expense-tracker/internal/handlers"
	"expense-tracker/internal/middleware"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/services"
	"expense-tracker/internal/workers"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
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
		providerConfigs := []services.ProviderConfig{
			{Provider: cfg.LLM.Provider, APIKey: cfg.LLM.APIKey, Model: cfg.LLM.Model},
		}
		for _, fb := range cfg.LLM.Fallbacks {
			providerConfigs = append(providerConfigs, services.ProviderConfig{
				Provider: fb.Provider,
				APIKey:   fb.APIKey,
				Model:    fb.Model,
			})
		}
		aiService, err = services.NewAIServiceWithFallbacks(providerConfigs)
		if err != nil {
			log.Printf("Warning: Failed to initialize AI service: %v", err)
			log.Println("Transactions will be stored without AI extraction")
		} else {
			log.Printf("AI service initialized: provider=%s, model=%s, fallbacks=%d", cfg.LLM.Provider, cfg.LLM.Model, len(cfg.LLM.Fallbacks))
			// Create transaction processor with 0.9 confidence threshold
			processor = services.NewTransactionProcessor(smsParser, aiService, txRepo, catRepo, smsRepo, aiCallRepo, 0.9)
		}
	} else {
		log.Println("No LLM_API_KEY configured - AI extraction disabled")
	}

	// Initialize River (pgxpool + migrations + worker server)
	ctx := context.Background()
	pool, err := initRiverPool(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to create River pool: %v", err)
	}
	defer pool.Close()

	if err := runRiverMigrations(ctx, pool); err != nil {
		log.Fatalf("Failed to run River migrations: %v", err)
	}

	workerServer, riverClient, err := workers.NewWorkerServer(pool, processor)
	if err != nil {
		log.Fatalf("Failed to create River worker server: %v", err)
	}

	taskClient := workers.NewTaskClient(riverClient)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()
	go func() {
		if err := workerServer.Start(workerCtx); err != nil {
			log.Fatalf("River worker failed: %v", err)
		}
	}()
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		workerServer.Stop(shutdownCtx)
	}()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(&cfg.Auth)
	webhookHandler := handlers.NewWebhookHandler(smsRepo, processor, taskClient, cfg.SMS.WebhookID)
	categoryHandler := handlers.NewCategoryHandler(catRepo)
	transactionHandler := handlers.NewTransactionHandler(txRepo, catRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsRepo)
	smsHandler := handlers.NewSMSHandler(smsRepo, txRepo, catRepo, aiCallRepo, aiService)

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

			// SMS Messages (browse unconverted + manual conversion)
			sms := protected.Group("/sms")
			{
				sms.GET("", smsHandler.ListSMS)
				sms.POST("/:id/extract", smsHandler.ExtractSMS)
				sms.POST("/:id/convert", smsHandler.ConvertSMS)
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

func initRiverPool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, cfg.Database.DSN())
	if err != nil {
		return nil, fmt.Errorf("failed to create pgxpool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database via pgxpool: %w", err)
	}
	log.Println("River pgxpool connection established")
	return pool, nil
}

func runRiverMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrator, err := rivermigrate.New(riverpgxv5.New(pool), nil)
	if err != nil {
		return fmt.Errorf("failed to create river migrator: %w", err)
	}
	res, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil)
	if err != nil {
		return fmt.Errorf("river migrations failed: %w", err)
	}
	for _, v := range res.Versions {
		log.Printf("River migration applied: version=%d", v.Version)
	}
	return nil
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
