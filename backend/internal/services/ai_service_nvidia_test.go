package services_test

import (
	"context"
	"os"
	"strings"
	"testing"

	"expense-tracker/internal/services"
)

func TestNvidiaProvider_GenerateText(t *testing.T) {
	apiKey := "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"
	if apiKey == "" {
		t.Skip("NVIDIA_API_KEY not set")
	}

	svc, err := services.NewAIService("nvidia", apiKey, "deepseek-ai/deepseek-v4-pro")
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

func TestNvidiaProvider_ExtractTransaction_TableDriven(t *testing.T) {
	apiKey := os.Getenv("NVIDIA_API_KEY")
	if apiKey == "" {
		t.Skip("NVIDIA_API_KEY not set")
	}

	svc, err := services.NewAIService("nvidia", apiKey, "deepseek-ai/deepseek-v4-flash")
	if err != nil {
		t.Fatalf("failed to create AI service: %v", err)
	}

	tests := []struct {
		name         string
		sms          string
		wantErr      bool // OTP/verification messages should be rejected as non-transactional
		wantType     string
		wantAmount   float64
		wantMerchant string // substring match, case-insensitive; empty skips the check
	}{
		{
			name:    "OTP verification message is not a transaction",
			sms:     "Customer,Your ECOM transaction of INR 173.00 at ZEPTO MARKETPLA on Advantage Club card requires verification.Kindly verify using OTP 500504.Never share OTP with anyone",
			wantErr: true,
		},
		{
			name:         "bank account debit with beneficiary name",
			sms:          "Your A/c XX6424 debited by Rs. 15.00 on 03/07/26; Namaste HSR credited. RRN 655008070537. Available balance Rs. 27,335.64. Team IDFC FIRST Bank",
			wantType:     "expense",
			wantAmount:   15.00,
			wantMerchant: "Namaste HSR",
		},
		{
			name:       "credit card reward/reimbursement credit",
			sms:        "Dear Customer, Rs 8800.00 is credited into your card and available balance is Rs 9029.75 -Advantage Club",
			wantAmount: 8800.00,
			wantType:   "income",
		},
		{
			name:         "large bank account debit to individual",
			sms:          "Your A/c XX6424 debited by Rs. 17,000.00 on 02/07/26; NITISH KUMAR credited. RRN 654931000966. Available balance Rs. 27,531.64. Team IDFC FIRST Bank",
			wantType:     "expense",
			wantAmount:   17000.00,
			wantMerchant: "NITISH KUMAR",
		},
		{
			name:       "small interest credit",
			sms:        "Your account XX8643 is credited with INR 1.00 on 01-07-2026. Info:20052215538643:Int.Pd:01-06-20.The Curr bal is  6.85. SBM BANK (INDIA).",
			wantType:   "income",
			wantAmount: 1.00,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			txData, meta, err := svc.ExtractTransaction(context.Background(), tc.sms)

			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected extraction to fail as non-transactional, got txData: %+v", txData)
				}
				t.Logf("got expected error: %v", err)
				return
			}

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

			if txData.Amount != tc.wantAmount {
				t.Errorf("expected amount=%.2f, got %.2f", tc.wantAmount, txData.Amount)
			}
			if tc.wantType != "" && txData.Type != tc.wantType {
				t.Errorf("expected type=%s, got %s", tc.wantType, txData.Type)
			}
			if tc.wantMerchant != "" && !strings.Contains(strings.ToLower(txData.Merchant), strings.ToLower(tc.wantMerchant)) {
				t.Errorf("expected merchant to contain %q, got %q", tc.wantMerchant, txData.Merchant)
			}
			if txData.Merchant == "" {
				t.Error("expected non-empty merchant")
			}
		})
	}
}
