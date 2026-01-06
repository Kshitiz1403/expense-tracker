package workers

import (
	"context"
	"encoding/json"
	"expense-tracker/internal/services"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

// Task type constants
const (
	TypeProcessSMS = "sms:process"
)

// Task payload structures
type ProcessSMSPayload struct {
	SMSID uuid.UUID `json:"sms_id"`
}

// SMSTaskHandler handles SMS processing tasks
type SMSTaskHandler struct {
	processor *services.TransactionProcessor
}

func NewSMSTaskHandler(processor *services.TransactionProcessor) *SMSTaskHandler {
	return &SMSTaskHandler{
		processor: processor,
	}
}

// HandleProcessSMS processes an SMS message task
func (h *SMSTaskHandler) HandleProcessSMS(ctx context.Context, task *asynq.Task) error {
	var payload ProcessSMSPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	log.Printf("Processing SMS task: SMSID=%s", payload.SMSID)

	// Process the SMS
	if err := h.processor.ProcessSMS(ctx, payload.SMSID); err != nil {
		return fmt.Errorf("failed to process SMS: %w", err)
	}

	log.Printf("Successfully processed SMS: SMSID=%s", payload.SMSID)
	return nil
}
