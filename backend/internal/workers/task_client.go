package workers

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river"
)

// TaskClient wraps the River client for enqueueing jobs.
type TaskClient struct {
	riverClient *river.Client[pgx.Tx]
}

func NewTaskClient(riverClient *river.Client[pgx.Tx]) *TaskClient {
	return &TaskClient{riverClient: riverClient}
}

// EnqueueProcessSMS inserts an SMS processing job into the River queue.
func (c *TaskClient) EnqueueProcessSMS(ctx context.Context, smsID uuid.UUID) error {
	_, err := c.riverClient.Insert(ctx, ProcessSMSArgs{SMSID: smsID}, &river.InsertOpts{
		Queue:       "sms",
		MaxAttempts: 30,
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue SMS job: %w", err)
	}
	return nil
}
