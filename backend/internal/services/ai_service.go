package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
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
	Date        time.Time `json:"-"`    // Parsed from DateStr
	DateStr     string    `json:"date"` // Raw date from AI
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Confidence  float64   `json:"confidence"` // 0.0 to 1.0
}

// UnmarshalJSON custom unmarshaler to handle flexible date formats
func (t *TransactionData) UnmarshalJSON(data []byte) error {
	type Alias TransactionData
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(t),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Parse date from string - try multiple formats
	if t.DateStr != "" {
		parsedDate, err := parseFlexibleDate(t.DateStr)
		if err != nil {
			// Default to current date if parsing fails
			t.Date = time.Now()
		} else {
			t.Date = parsedDate
		}
	} else {
		t.Date = time.Now()
	}

	return nil
}

// parseFlexibleDate tries to parse date in multiple formats
func parseFlexibleDate(dateStr string) (time.Time, error) {
	formats := []string{
		time.RFC3339,          // "2006-01-02T15:04:05Z07:00"
		"2006-01-02",          // "2026-01-06"
		"2006-01-02 15:04:05", // "2026-01-06 14:30:00"
		"02/01/2006",          // "06/01/2026"
		"January 2, 2006",     // "January 6, 2026"
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

// LLMCallMeta holds raw metadata about an LLM call for audit logging
type LLMCallMeta struct {
	Prompt      string
	RawResponse string
	DurationMs  int64
}

// AIService handles LLM interactions for transaction extraction
type AIService struct {
	llm      llms.Model
	Model    string
	Provider string
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
		Model:    model,
		Provider: provider,
	}, nil
}

// ExtractTransaction uses LLM to extract transaction details from SMS
func (s *AIService) ExtractTransaction(ctx context.Context, smsMessage string) (*TransactionData, *LLMCallMeta, error) {
	prompt := s.buildExtractionPrompt(smsMessage)

	// Call LLM
	start := time.Now()
	response, err := llms.GenerateFromSinglePrompt(ctx, s.llm, prompt)
	meta := &LLMCallMeta{
		Prompt:      prompt,
		RawResponse: response,
		DurationMs:  time.Since(start).Milliseconds(),
	}
	if err != nil {
		return nil, meta, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Strip markdown code blocks if present
	jsonStr := s.stripMarkdown(response)

	// Parse JSON response
	var txData TransactionData
	if err := json.Unmarshal([]byte(jsonStr), &txData); err != nil {
		return nil, meta, fmt.Errorf("failed to parse LLM response: %w (response: %s)", err, jsonStr)
	}

	// Validate extracted data
	if err := s.validateTransaction(&txData); err != nil {
		return nil, meta, fmt.Errorf("invalid transaction data: %w", err)
	}

	return &txData, meta, nil
}

// stripMarkdown removes markdown code block formatting from AI responses
func (s *AIService) stripMarkdown(text string) string {
	// Remove ```json ... ``` or ``` ... ``` blocks
	text = strings.TrimSpace(text)

	// Check for code block markers
	if strings.HasPrefix(text, "```") {
		// Find the first newline after opening ```
		start := strings.Index(text, "\n")
		if start == -1 {
			start = 3 // Just ```
		} else {
			start++ // Skip the newline
		}

		// Find the closing ```
		end := strings.LastIndex(text, "```")
		if end > start {
			text = text[start:end]
		}
	}

	return strings.TrimSpace(text)
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
