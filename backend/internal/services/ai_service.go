package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
)

// TransactionData represents the structured output from AI extraction
type TransactionData struct {
	Amount      float64   `json:"amount"`
	Type        string    `json:"type"` // "income" or "expense"
	Merchant    string    `json:"merchant"`
	Date        time.Time `json:"date"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Confidence  float64   `json:"confidence"` // 0.0 to 1.0
}

// AIService handles LLM interactions for transaction extraction
type AIService struct {
	llm      llms.Model
	model    string
	provider string
}

// NewAIService creates a new AI service with the specified provider
func NewAIService(provider, apiKey, model string) (*AIService, error) {
	var llm llms.Model
	var err error

	switch provider {
	case "openai":
		llm, err = openai.New(
			openai.WithToken(apiKey),
			openai.WithModel(model),
		)
	case "anthropic":
		llm, err = anthropic.New(
			anthropic.WithToken(apiKey),
			anthropic.WithModel(model),
		)
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", provider)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to initialize LLM: %w", err)
	}

	return &AIService{
		llm:      llm,
		model:    model,
		provider: provider,
	}, nil
}

// ExtractTransaction uses LLM to extract transaction details from SMS
func (s *AIService) ExtractTransaction(ctx context.Context, smsMessage string) (*TransactionData, error) {
	prompt := s.buildExtractionPrompt(smsMessage)

	// Call LLM
	response, err := llms.GenerateFromSinglePrompt(ctx, s.llm, prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Parse JSON response
	var txData TransactionData
	if err := json.Unmarshal([]byte(response), &txData); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// Validate extracted data
	if err := s.validateTransaction(&txData); err != nil {
		return nil, fmt.Errorf("invalid transaction data: %w", err)
	}

	return &txData, nil
}

func (s *AIService) buildExtractionPrompt(smsMessage string) string {
	return fmt.Sprintf(`You are a transaction extraction system. Extract transaction details from the following bank SMS message and return ONLY a valid JSON object with no additional text.

SMS Message:
"%s"

Extract and return a JSON object with these fields:
{
  "amount": (number) transaction amount,
  "type": (string) either "income" or "expense",
  "merchant": (string) merchant or source name,
  "date": (string) transaction date in ISO 8601 format (if not found, use current date),
  "category": (string) suggested category (e.g., "Dining", "Groceries", "Transport", "Salary"),
  "description": (string) brief description,
  "confidence": (number) your confidence level from 0.0 to 1.0
}

Rules:
- Return ONLY the JSON object, no markdown, no explanations
- Amount must be a number (no currency symbols)
- Type must be exactly "income" or "expense"
- If you cannot extract a field with confidence, use reasonable defaults
- Confidence should reflect how certain you are about the extraction
- For unclear transactions, use lower confidence (< 0.7)

Return only valid JSON:`, smsMessage)
}

func (s *AIService) validateTransaction(tx *TransactionData) error {
	if tx.Amount <= 0 {
		return fmt.Errorf("invalid amount: %f", tx.Amount)
	}

	if tx.Type != "income" && tx.Type != "expense" {
		return fmt.Errorf("invalid type: %s (must be 'income' or 'expense')", tx.Type)
	}

	if tx.Merchant == "" {
		return fmt.Errorf("merchant cannot be empty")
	}

	if tx.Confidence < 0 || tx.Confidence > 1 {
		return fmt.Errorf("invalid confidence: %f (must be between 0 and 1)", tx.Confidence)
	}

	return nil
}
