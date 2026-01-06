package services

import (
	"testing"
)

func TestSMSParser_TransactionMessage(t *testing.T) {
	parser := NewSMSParser()

	tests := []struct {
		name          string
		message       string
		phoneNumber   string
		shouldBeValid bool
		expectedType  MessageType
	}{
		{
			name:          "IDFC Debit Transaction",
			message:       "Your A/c XX6424 debited by Rs. 420.00 on 06/01/26; APNA DHABA TASTE OF credited.",
			phoneNumber:   "JD-IDFCFB-S",
			shouldBeValid: true,
			expectedType:  MessageTypeTransaction,
		},
		{
			name:          "HDFC Spent Transaction",
			message:       "Spent Rs.744 On HDFC Bank Card 0676 At TOWER 5IAND5J BUNDLTECHNO On 2026-01-06:17:16:55",
			phoneNumber:   "AD-HDFCBK-S",
			shouldBeValid: true,
			expectedType:  MessageTypeTransaction,
		},
		{
			name:          "Federal Credit Transaction",
			message:       "Kshitiz, KSHITIZ has sent INR 140,400.00 to you. Mode:NEFT | January 6, 2026",
			phoneNumber:   "AD-FedFiB-S",
			shouldBeValid: true,
			expectedType:  MessageTypeTransaction,
		},
		{
			name:          "OTP Message",
			message:       "OTP is 094139 for txn of INR 744.00 at BUNDL TECHN on HDFC Bank card ending 0676.",
			phoneNumber:   "JM-HDFCBK-S",
			shouldBeValid: false,
			expectedType:  MessageTypeOTP,
		},
		{
			name:          "Another OTP Format",
			message:       "286549 is your OTP for transaction. Do not share OTP for security reasons",
			phoneNumber:   "VM-BANK",
			shouldBeValid: false,
			expectedType:  MessageTypeOTP,
		},
		{
			name:          "Promotional Message",
			message:       "Get 20% cashback on all purchases! Limited time offer. Click here to shop now and save upto Rs. 5000",
			phoneNumber:   "AD-PROMO",
			shouldBeValid: false,
			expectedType:  MessageTypePromo,
		},
		{
			name:          "WiFi Credentials (Non-transaction)",
			message:       "Dear Kshitiz, your Wifi name for 5 GHz is Excitel_SonOfAnton and password is tandoorinights.",
			phoneNumber:   "CP-EXCITE-S",
			shouldBeValid: false,
			expectedType:  MessageTypeOther,
		},
		{
			name:          "Transaction with Rupee Symbol",
			message:       "Your account has been debited with ₹1,234 at Amazon. Available balance: ₹50,000",
			phoneNumber:   "BANK-XYZ",
			shouldBeValid: true,
			expectedType:  MessageTypeTransaction,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			classification := parser.ClassifyMessage(tt.message, tt.phoneNumber)

			if classification.IsValid != tt.shouldBeValid {
				t.Errorf("Expected IsValid=%v, got %v. Reason: %s",
					tt.shouldBeValid, classification.IsValid, classification.Reason)
			}

			if classification.Type != tt.expectedType {
				t.Errorf("Expected Type=%s, got %s",
					tt.expectedType, classification.Type)
			}
		})
	}
}

func TestSMSParser_EdgeCases(t *testing.T) {
	parser := NewSMSParser()

	t.Run("Empty Message", func(t *testing.T) {
		classification := parser.ClassifyMessage("", "TEST")
		if classification.IsValid {
			t.Error("Empty message should not be valid")
		}
	})

	t.Run("Only Amount No Keywords", func(t *testing.T) {
		classification := parser.ClassifyMessage("Rs. 500", "TEST")
		if classification.IsValid {
			t.Error("Amount alone without transaction keywords should not be valid")
		}
	})

	t.Run("Transaction Keyword But No Amount", func(t *testing.T) {
		classification := parser.ClassifyMessage("Your account was debited successfully", "TEST")
		if classification.IsValid {
			t.Error("Transaction keyword without amount should not be valid")
		}
	})
}

func TestSMSParser_ParseSMS_BackwardCompatibility(t *testing.T) {
	parser := NewSMSParser()

	message := "Your A/c XX6424 debited by Rs. 420.00 on 06/01/26; APNA DHABA credited."

	classification, err := parser.ParseSMS(message, "JD-IDFCFB-S")
	if err != nil {
		t.Fatalf("Expected successful parse, got error: %v", err)
	}

	if !classification.IsValid {
		t.Error("Transaction message should be valid")
	}

	if classification.Type != MessageTypeTransaction {
		t.Errorf("Expected MessageTypeTransaction, got %s", classification.Type)
	}
}

func TestSMSParser_OTPWithTransaction(t *testing.T) {
	parser := NewSMSParser()

	// OTP messages mentioning transactions should still be classified as OTP
	message := "OTP is 123456 for your transaction of Rs. 5000 at Merchant XYZ"

	classification := parser.ClassifyMessage(message, "TEST")

	if classification.Type != MessageTypeOTP {
		t.Errorf("Expected MessageTypeOTP (OTP takes priority), got %s", classification.Type)
	}

	if classification.IsValid {
		t.Error("OTP messages should never be valid for processing")
	}
}
