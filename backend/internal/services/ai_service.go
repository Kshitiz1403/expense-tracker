package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
)

const nvidiaBaseURL = "https://integrate.api.nvidia.com/v1"

// llmProvider is a simple abstraction over any text generation backend.
type llmProvider interface {
	generateText(ctx context.Context, prompt string) (string, error)
}

// langchainProvider wraps a langchaingo llms.Model.
type langchainProvider struct{ llm llms.Model }

func (p *langchainProvider) generateText(ctx context.Context, prompt string) (string, error) {
	return llms.GenerateFromSinglePrompt(ctx, p.llm, prompt)
}

// nvidiaProvider calls the NVIDIA NIM chat completions API directly.
type nvidiaProvider struct {
	apiKey  string
	model   string
	baseURL string
}

func (p *nvidiaProvider) generateText(ctx context.Context, prompt string) (string, error) {
	reqBody, err := json.Marshal(map[string]any{
		"model":      p.model,
		"messages":   []map[string]string{{"role": "user", "content": prompt}},
		"max_tokens": 1024,
		"stream":     false,
	})
	if err != nil {
		return "", fmt.Errorf("nvidia: failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("nvidia: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("nvidia: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("nvidia: failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("nvidia: API error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("nvidia: failed to parse response: %w", err)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("nvidia: empty choices in response")
	}

	return result.Choices[0].Message.Content, nil
}

// TransactionData represents the structured output from AI extraction
type TransactionData struct {
	Amount      float64 `json:"amount"`
	Type        string  `json:"type"` // "income" or "expense"
	Merchant    string  `json:"merchant"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
	Confidence  float64 `json:"confidence"` // 0.0 to 1.0
}

// LLMCallMeta holds raw metadata about an LLM call for audit logging
type LLMCallMeta struct {
	Prompt      string
	RawResponse string
	DurationMs  int64
}

// AIService handles LLM interactions for transaction extraction
type AIService struct {
	llm      llmProvider
	Model    string
	Provider string
}

// NewAIService creates a new AI service with the specified provider
func NewAIService(provider, apiKey, model string) (*AIService, error) {
	var lp llmProvider

	switch provider {
	case "openai":
		llm, err := openai.New(
			openai.WithToken(apiKey),
			openai.WithModel(model),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize LLM: %w", err)
		}
		lp = &langchainProvider{llm: llm}
	case "anthropic":
		llm, err := anthropic.New(
			anthropic.WithToken(apiKey),
			anthropic.WithModel(model),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize LLM: %w", err)
		}
		lp = &langchainProvider{llm: llm}
	case "nvidia":
		lp = &nvidiaProvider{apiKey: apiKey, model: model, baseURL: nvidiaBaseURL}
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", provider)
	}

	return &AIService{
		llm:      lp,
		Model:    model,
		Provider: provider,
	}, nil
}

// ExtractTransaction uses LLM to extract transaction details from SMS
func (s *AIService) ExtractTransaction(ctx context.Context, smsMessage string) (*TransactionData, *LLMCallMeta, error) {
	prompt := s.buildExtractionPrompt(smsMessage)

	start := time.Now()
	response, err := s.llm.generateText(ctx, prompt)
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
	text = strings.TrimSpace(text)

	if strings.HasPrefix(text, "```") {
		start := strings.Index(text, "\n")
		if start == -1 {
			start = 3
		} else {
			start++
		}

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
