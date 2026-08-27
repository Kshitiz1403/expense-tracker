package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// NormalizedSMS is the common representation produced by all SMS webhook providers.
type NormalizedSMS struct {
	EventID     string // unique deterministic ID used for idempotency
	EventType   string
	DeviceID    string
	WebhookID   string
	MessageID   string
	Message     string
	PhoneNumber string
	SimNumber   int
	ReceivedAt  time.Time
}

// SMSWebhookProvider parses a raw webhook body into a NormalizedSMS.
type SMSWebhookProvider interface {
	Parse(body []byte) (*NormalizedSMS, error)
}

// NewSMSWebhookProvider is a factory that returns the provider for the given name.
func NewSMSWebhookProvider(name string) (SMSWebhookProvider, error) {
	switch name {
	case "android_gateway":
		return &androidGatewayProvider{}, nil
	case "v2":
		return &v2Provider{}, nil
	default:
		return nil, fmt.Errorf("unsupported SMS provider: %s", name)
	}
}

// ─── Android SMS Gateway (v1) ────────────────────────────────────────────────

type androidGatewayProvider struct{}

type androidGatewayPayload struct {
	DeviceID  string `json:"deviceId"`
	Event     string `json:"event"`
	ID        string `json:"id"`
	WebhookID string `json:"webhookId"`
	Payload   struct {
		Message     string `json:"message"`
		ReceivedAt  string `json:"receivedAt"` // RFC3339
		MessageID   string `json:"messageId"`
		PhoneNumber string `json:"phoneNumber"`
		SimNumber   int    `json:"simNumber"`
	} `json:"payload"`
}

func (p *androidGatewayProvider) Parse(body []byte) (*NormalizedSMS, error) {
	var raw androidGatewayPayload
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("android_gateway: invalid JSON: %w", err)
	}

	receivedAt, err := time.Parse(time.RFC3339, raw.Payload.ReceivedAt)
	if err != nil {
		receivedAt = time.Now()
	}

	return &NormalizedSMS{
		EventID:     raw.ID,
		EventType:   raw.Event,
		DeviceID:    raw.DeviceID,
		WebhookID:   raw.WebhookID,
		MessageID:   raw.Payload.MessageID,
		Message:     raw.Payload.Message,
		PhoneNumber: raw.Payload.PhoneNumber,
		SimNumber:   raw.Payload.SimNumber,
		ReceivedAt:  receivedAt,
	}, nil
}

// ─── v2 Provider ─────────────────────────────────────────────────────────────

type v2Provider struct{}

type v2Payload struct {
	DeviceID      string `json:"deviceId"`
	Event         string `json:"event"`
	From          string `json:"from"`
	Text          string `json:"text"`
	SentStamp     int64  `json:"sentStamp"`     // unix ms
	ReceivedStamp int64  `json:"receivedStamp"` // unix ms
	Sim           string `json:"sim"`           // e.g. "sim1", "sim2"
}

func (p *v2Provider) Parse(body []byte) (*NormalizedSMS, error) {
	var raw v2Payload
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("v2: invalid JSON: %w", err)
	}

	receivedAt := time.UnixMilli(raw.ReceivedStamp)
	simNumber := parseSimNumber(raw.Sim)
	eventID := generateEventID(raw.DeviceID, raw.Event, raw.From, raw.Text, raw.SentStamp, raw.ReceivedStamp)

	return &NormalizedSMS{
		EventID:     eventID,
		EventType:   raw.Event,
		DeviceID:    raw.DeviceID,
		Message:     raw.Text,
		PhoneNumber: raw.From,
		SimNumber:   simNumber,
		ReceivedAt:  receivedAt,
	}, nil
}

// parseSimNumber converts "sim1" → 1, "sim2" → 2, etc. Returns 0 on failure.
func parseSimNumber(sim string) int {
	trimmed := strings.TrimPrefix(strings.ToLower(sim), "sim")
	n, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0
	}
	return n
}

// generateEventID produces a deterministic SHA-256 hex ID for deduplication.
func generateEventID(deviceID, event, from, text string, sentStamp, receivedStamp int64) string {
	raw := fmt.Sprintf("%s:%s:%s:%s:%d:%d", deviceID, event, from, text, sentStamp, receivedStamp)
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
