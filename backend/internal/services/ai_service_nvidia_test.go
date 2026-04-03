package services_test

import (
	"context"
	"os"
	"testing"

	"expense-tracker/internal/services"
)

func TestNvidiaProvider_GenerateText(t *testing.T) {
	apiKey := os.Getenv("NVIDIA_API_KEY")
	if apiKey == "" {
		t.Skip("NVIDIA_API_KEY not set")
	}

	svc, err := services.NewAIService("nvidia", apiKey, "moonshotai/kimi-k2.5")
	if err != nil {
		t.Fatalf("failed to create AI service: %v", err)
	}

	sms := "Dear Customer, Rs.2,500.00 debited from your account ending 4321 on 03-Apr-2026 at SWIGGY. Avail bal: Rs.12,345.67"

	txData, meta, err := svc.ExtractTransaction(context.Background(), sms)
	if err != nil {
		t.Fatalf("ExtractTransaction failed: %v\nRaw response: %s", err, meta.RawResponse)
	}

	t.Logf("Duration : %d ms", meta.DurationMs)
	t.Logf("Amount   : %.2f", txData.Amount)
	t.Logf("Type     : %s", txData.Type)
	t.Logf("Merchant : %s", txData.Merchant)
	t.Logf("Category : %s", txData.Category)
	t.Logf("Desc     : %s", txData.Description)
	t.Logf("Confidence: %.2f", txData.Confidence)

	if txData.Amount <= 0 {
		t.Errorf("expected positive amount, got %.2f", txData.Amount)
	}
	if txData.Type != "expense" {
		t.Errorf("expected type=expense, got %s", txData.Type)
	}
	if txData.Merchant == "" {
		t.Error("expected non-empty merchant")
	}
}
