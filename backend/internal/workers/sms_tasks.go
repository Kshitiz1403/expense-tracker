package workers

import (
	"context"
	"expense-tracker/internal/services"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/riverqueue/river"
)

type ProcessSMSArgs struct {
	SMSID  uuid.UUID `json:"sms_id"`
	UserID uuid.UUID `json:"user_id"`
}

func (ProcessSMSArgs) Kind() string { return "sms:process" }

type SMSWorker struct {
	river.WorkerDefaults[ProcessSMSArgs]
	processor *services.TransactionProcessor
}

func NewSMSWorker(processor *services.TransactionProcessor) *SMSWorker {
	return &SMSWorker{processor: processor}
}

func (w *SMSWorker) Work(ctx context.Context, job *river.Job[ProcessSMSArgs]) error {
	log.Printf("Processing SMS job: SMSID=%s UserID=%s attempt=%d", job.Args.SMSID, job.Args.UserID, job.Attempt)
	if err := w.processor.ProcessSMS(ctx, job.Args.SMSID, job.Args.UserID); err != nil {
		return fmt.Errorf("failed to process SMS: %w", err)
	}
	log.Printf("Successfully processed SMS: SMSID=%s", job.Args.SMSID)
	return nil
}
