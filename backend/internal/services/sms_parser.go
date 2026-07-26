package services

import (
	"fmt"
	"regexp"
	"strings"
)

// MessageType represents the classification of an SMS message
type MessageType string

const (
	MessageTypeTransaction MessageType = "transaction"
	MessageTypeOTP         MessageType = "otp"
	MessageTypePromo       MessageType = "promotional"
	MessageTypeOther       MessageType = "other"
)

// SMSClassification represents the result of classifying an SMS
type SMSClassification struct {
	Type        MessageType
	IsValid     bool   // true if this should be processed further
	Reason      string // explanation of classification
	PhoneNumber string
	Message     string
}

// SMSParser handles lightweight classification of SMS messages
type SMSParser struct{}

func NewSMSParser() *SMSParser {
	return &SMSParser{}
}

// ClassifyMessage determines if an SMS is a transaction message
// Returns classification - only transaction messages should be sent to AI
func (p *SMSParser) ClassifyMessage(message string, phoneNumber string) *SMSClassification {
	// 1. OTP check (highest priority)
	if p.isOTPMessage(message) {
		return &SMSClassification{
			Type:        MessageTypeOTP,
			IsValid:     false,
			Reason:      "OTP/verification code message",
			PhoneNumber: phoneNumber,
			Message:     message,
		}
	}

	// 2. Strong action word + amount → Transaction immediately, skip promo check.
	//    Prevents "cashback reward credited" from being filtered as promotional.
	if p.hasStrongTransactionKeyword(message) && p.hasAmountPattern(message) {
		return &SMSClassification{
			Type:        MessageTypeTransaction,
			IsValid:     true,
			Reason:      "Contains strong transaction keyword (debited/credited/upi/etc.)",
			PhoneNumber: phoneNumber,
			Message:     message,
		}
	}

	// 3. Promo check — only reached for currency-only signals like "Rs. 5000 offer"
	if p.isPromotionalMessage(message) {
		return &SMSClassification{
			Type:        MessageTypePromo,
			IsValid:     false,
			Reason:      "Promotional/marketing message",
			PhoneNumber: phoneNumber,
			Message:     message,
		}
	}

	// 4. Weak currency keywords (Rs., INR, ₹) with amount
	if p.isTransactionMessage(message) {
		return &SMSClassification{
			Type:        MessageTypeTransaction,
			IsValid:     true,
			Reason:      "Contains transaction keywords (debited/credited/spent)",
			PhoneNumber: phoneNumber,
			Message:     message,
		}
	}

	// 5. Everything else
	return &SMSClassification{
		Type:        MessageTypeOther,
		IsValid:     false,
		Reason:      "No transaction keywords found",
		PhoneNumber: phoneNumber,
		Message:     message,
	}
}

// hasStrongTransactionKeyword checks for unambiguous transaction action words
func (p *SMSParser) hasStrongTransactionKeyword(message string) bool {
	strongKeywords := []string{
		"debited", "credited", "spent", "paid",
		"withdrawn", "deposit", "transfer", "sent",
		"upi",
	}
	lowerMsg := strings.ToLower(message)
	for _, kw := range strongKeywords {
		if strings.Contains(lowerMsg, kw) {
			return true
		}
	}
	return false
}

// hasAmountPattern checks for a currency amount in the message
func (p *SMSParser) hasAmountPattern(message string) bool {
	amountPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)Rs\.?\s*\d+`),
		regexp.MustCompile(`(?i)INR\s*[\d,]+`),
		regexp.MustCompile(`₹\s*[\d,]+`),
	}
	for _, pattern := range amountPatterns {
		if pattern.MatchString(message) {
			return true
		}
	}
	return false
}

// isTransactionMessage checks for common transaction keywords
func (p *SMSParser) isTransactionMessage(message string) bool {
	// Simple keyword matching for transaction indicators
	transactionKeywords := []string{
		"debited", "credited", "spent", "paid",
		"withdrawn", "deposit", "transfer", "sent",
		"Rs.", "Rs ", "INR", "₹",
		"upi",
	}

	lowerMsg := strings.ToLower(message)

	// Must contain at least one transaction keyword
	hasTransactionKeyword := false
	for _, keyword := range transactionKeywords {
		if strings.Contains(lowerMsg, strings.ToLower(keyword)) {
			hasTransactionKeyword = true
			break
		}
	}

	if !hasTransactionKeyword {
		return false
	}

	// Additional validation: should contain amount pattern
	// Look for patterns like: Rs. 123, INR 123.45, ₹123
	amountPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)Rs\.?\s*\d+`),
		regexp.MustCompile(`(?i)INR\s*\d+`),
		regexp.MustCompile(`₹\s*\d+`),
	}

	for _, pattern := range amountPatterns {
		if pattern.MatchString(message) {
			return true
		}
	}

	return false
}

// isOTPMessage checks if message is an OTP/verification code
func (p *SMSParser) isOTPMessage(message string) bool {
	otpPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)OTP\s+is\s+\d+`),
		regexp.MustCompile(`(?i)one[\s-]?time\s+password`),
		regexp.MustCompile(`(?i)\d{4,6}\s+is\s+your\s+(OTP|code|verification)`),
		regexp.MustCompile(`(?i)verification\s+code\s*:?\s*\d+`),
		regexp.MustCompile(`(?i)(\d{4,6})\s+is\s+the\s+OTP`),
		regexp.MustCompile(`(?i)share\s+OTP`),
		regexp.MustCompile(`(?i)verify\s+using\s+OTP`),
		regexp.MustCompile(`(?i)OTP\s+\d{4,6}`),
	}

	for _, pattern := range otpPatterns {
		if pattern.MatchString(message) {
			return true
		}
	}
	return false
}

// isPromotionalMessage checks for promotional/marketing content
func (p *SMSParser) isPromotionalMessage(message string) bool {
	promoKeywords := []string{
		"offer", "discount", "cashback", "reward",
		"click here", "download app", "install",
		"subscribe", "renew", "upgrade", "get now",
		"limited time", "hurry", "don't miss",
		"shop now", "buy now", "save upto",
	}

	lowerMsg := strings.ToLower(message)
	matchCount := 0

	for _, keyword := range promoKeywords {
		if strings.Contains(lowerMsg, keyword) {
			matchCount++
		}
	}

	// If 2 or more promo keywords, likely promotional
	return matchCount >= 2
}

// ParseSMS is now just a wrapper around ClassifyMessage for backward compatibility
// Returns error if not a valid transaction message
func (p *SMSParser) ParseSMS(message string, phoneNumber string) (*SMSClassification, error) {
	classification := p.ClassifyMessage(message, phoneNumber)

	if classification.IsValid {
		return classification, nil
	}

	return nil, fmt.Errorf("not a transaction message: %s", classification.Reason)
}
