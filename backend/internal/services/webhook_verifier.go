package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"
)

type WebhookVerifier struct {
	secret string
}

func NewWebhookVerifier(secret string) *WebhookVerifier {
	return &WebhookVerifier{
		secret: secret,
	}
}

// VerifySignature verifies the webhook signature using HMAC-SHA256
func (v *WebhookVerifier) VerifySignature(payload []byte, signature string, timestamp string) error {
	// Parse timestamp
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp: %w", err)
	}

	// Check if timestamp is too old (more than 5 minutes)
	now := time.Now().Unix()
	if now-ts > 300 {
		return fmt.Errorf("timestamp too old: %d seconds", now-ts)
	}

	// Create HMAC
	mac := hmac.New(sha256.New, []byte(v.secret))
	mac.Write([]byte(timestamp))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	// Compare signatures
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return fmt.Errorf("invalid signature")
	}

	return nil
}
