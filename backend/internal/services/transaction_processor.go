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

// ProcessSMS processes an SMS message and creates a transaction if applicable.
func (p *TransactionProcessor) ProcessSMS(ctx context.Context, smsID uuid.UUID, userID uuid.UUID) error {
	sms, err := p.smsRepo.GetByID(smsID, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch SMS: %w", err)
	}
	if sms == nil {
		return fmt.Errorf("SMS not found: %s", smsID)
	}

	existingTx, err := p.txRepo.GetBySourceID(smsID)
	if err != nil {
		return fmt.Errorf("failed to check existing transaction: %w", err)
	}
	if existingTx != nil {
		log.Printf("Transaction already exists for SMS %s", smsID)
		return nil
	}

	classification := p.smsParser.ClassifyMessage(sms.Message, sms.PhoneNumber)
	if !classification.IsValid {
		log.Printf("SMS %s classified as %s: %s", smsID, classification.Type, classification.Reason)
		p.smsRepo.MarkAsProcessed(smsID, &classification.Reason)
		return nil
	}

	log.Printf("SMS %s classified as transaction, sending to AI for extraction", smsID)

	txData, meta, err := p.aiService.ExtractTransaction(ctx, sms.Message)

	aiCall := &models.AICall{
		SMSID:       &smsID,
		Provider:    p.aiService.Provider,
		Model:       p.aiService.Model,
		Prompt:      meta.Prompt,
		RawResponse: meta.RawResponse,
		DurationMs:  meta.DurationMs,
		Success:     err == nil,
	}

	if err != nil {
		if errors.Is(err, ErrNotATransaction) {
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

	parsedJSON, _ := json.Marshal(txData)
	parsedStr := string(parsedJSON)
	aiCall.ParsedResult = &parsedStr

	// Find or create category scoped to this user
	category, err := p.catRepo.GetByName(txData.Category, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch category: %w", err)
	}
	if category == nil && txData.Category != "" {
		category = &models.Category{
			UserID: &userID,
			Name:   txData.Category,
			Type:   txData.Type,
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

	requiresReview := txData.Confidence < p.confidenceThreshold

	transaction := &models.Transaction{
		UserID:                userID,
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

	metadata, _ := json.Marshal(map[string]interface{}{
		"ai_category":    txData.Category,
		"ai_description": txData.Description,
		"raw_response":   txData,
	})
	metadataStr := string(metadata)
	transaction.AIMetadata = &metadataStr

	if err := p.txRepo.Create(transaction); err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	log.Printf("Created transaction %s from SMS %s (confidence: %.2f, review: %v)",
		transaction.ID, smsID, txData.Confidence, requiresReview)

	aiCall.TransactionID = &transaction.ID
	p.aiCallRepo.Create(aiCall)
	p.smsRepo.MarkAsProcessed(smsID, nil)

	return nil
}
