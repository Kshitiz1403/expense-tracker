package services

import (
	"context"
	"encoding/json"
	"errors"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"fmt"
	"log"

	"github.com/google/uuid"
)

// TransactionProcessor handles the processing of SMS messages into transactions
type TransactionProcessor struct {
	smsParser           *SMSParser
	aiService           *AIService
	txRepo              *repository.TransactionRepository
	catRepo             *repository.CategoryRepository
	smsRepo             *repository.SMSRepository
	aiCallRepo          *repository.AICallRepository
	confidenceThreshold float64
}

func NewTransactionProcessor(
	smsParser *SMSParser,
	aiService *AIService,
	txRepo *repository.TransactionRepository,
	catRepo *repository.CategoryRepository,
	smsRepo *repository.SMSRepository,
	aiCallRepo *repository.AICallRepository,
	confidenceThreshold float64,
) *TransactionProcessor {
	return &TransactionProcessor{
		smsParser:           smsParser,
		aiService:           aiService,
		txRepo:              txRepo,
		catRepo:             catRepo,
		smsRepo:             smsRepo,
		aiCallRepo:          aiCallRepo,
		confidenceThreshold: confidenceThreshold,
	}
}

// ProcessSMS processes an SMS message and creates a transaction if applicable
func (p *TransactionProcessor) ProcessSMS(ctx context.Context, smsID uuid.UUID) error {
	// Fetch SMS message
	sms, err := p.smsRepo.GetByID(smsID)
	if err != nil {
		return fmt.Errorf("failed to fetch SMS: %w", err)
	}
	if sms == nil {
		return fmt.Errorf("SMS not found: %s", smsID)
	}

	// Check if already processed
	existingTx, err := p.txRepo.GetBySourceID(smsID)
	if err != nil {
		return fmt.Errorf("failed to check existing transaction: %w", err)
	}
	if existingTx != nil {
		log.Printf("Transaction already exists for SMS %s", smsID)
		return nil
	}

	// Classify message
	classification := p.smsParser.ClassifyMessage(sms.Message, sms.PhoneNumber)

	if !classification.IsValid {
		// Mark as processed but don't create transaction
		log.Printf("SMS %s classified as %s: %s", smsID, classification.Type, classification.Reason)
		p.smsRepo.MarkAsProcessed(smsID, &classification.Reason)
		return nil
	}

	log.Printf("SMS %s classified as transaction, sending to AI for extraction", smsID)

	// Extract transaction using AI
	txData, meta, err := p.aiService.ExtractTransaction(ctx, sms.Message)

	// Build AI call record (saved regardless of success/failure)
	aiCall := &models.AICall{
		SMSID:       &smsID,
		Provider:    meta.Provider,
		Model:       meta.Model,
		Prompt:      meta.Prompt,
		RawResponse: meta.RawResponse,
		DurationMs:  meta.DurationMs,
		Success:     err == nil,
	}

	if err != nil {
		if errors.Is(err, ErrNotATransaction) {
			// AI determined this is not a financial transaction — mark processed and move on.
			reason := "AI: not a transaction (confidence=0)"
			aiCall.Error = &reason
			p.aiCallRepo.Create(aiCall)
			log.Printf("SMS %s is not a transaction per AI, skipping", smsID)
			p.smsRepo.MarkAsProcessed(smsID, &reason)
			return nil
		}
		errorMsg := fmt.Sprintf("AI extraction failed: %v", err)
		errStr := err.Error()
		aiCall.Error = &errStr
		p.aiCallRepo.Create(aiCall)
		log.Printf("Error processing SMS %s: %s", smsID, errorMsg)
		p.smsRepo.MarkAsProcessed(smsID, &errorMsg)
		return fmt.Errorf("AI extraction failed: %w", err)
	}

	log.Printf("AI extracted transaction: Amount=%.2f, Type=%s, Merchant=%s, Confidence=%.2f",
		txData.Amount, txData.Type, txData.Merchant, txData.Confidence)

	// Store parsed result in AI call
	parsedJSON, _ := json.Marshal(txData)
	parsedStr := string(parsedJSON)
	aiCall.ParsedResult = &parsedStr

	// Find category by AI-suggested name, create it if not found
	category, err := p.catRepo.GetByName(txData.Category)
	if err != nil {
		return fmt.Errorf("failed to fetch category: %w", err)
	}
	if category == nil && txData.Category != "" {
		category = &models.Category{
			Name: txData.Category,
			Type: txData.Type,
		}
		if err := p.catRepo.Create(category); err != nil {
			log.Printf("Warning: failed to create category %q: %v", txData.Category, err)
			category = nil
		}
	}

	var categoryID *uuid.UUID
	if category != nil {
		categoryID = &category.ID
	}

	// Determine if requires review based on confidence threshold
	requiresReview := txData.Confidence < p.confidenceThreshold

	// Create transaction
	transaction := &models.Transaction{
		Description:           txData.Description,
		Amount:                txData.Amount,
		Type:                  txData.Type,
		TransactionDate:       sms.ReceivedAt,
		CategoryID:            categoryID,
		Merchant:              &txData.Merchant,
		Source:                "sms",
		SourceID:              &smsID,
		AIConfidence:          &txData.Confidence,
		AISuggestedCategoryID: categoryID,
		RequiresReview:        requiresReview,
	}

	// Store AI metadata
	metadata, _ := json.Marshal(map[string]interface{}{
		"ai_category":    txData.Category,
		"ai_description": txData.Description,
		"raw_response":   txData,
	})
	metadataStr := string(metadata)
	transaction.AIMetadata = &metadataStr

	// Save transaction
	if err := p.txRepo.Create(transaction); err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	log.Printf("Created transaction %s from SMS %s (confidence: %.2f, review: %v)",
		transaction.ID, smsID, txData.Confidence, requiresReview)

	// Save AI call record linked to the created transaction
	aiCall.TransactionID = &transaction.ID
	p.aiCallRepo.Create(aiCall)

	// Mark SMS as processed
	p.smsRepo.MarkAsProcessed(smsID, nil)

	return nil
}
