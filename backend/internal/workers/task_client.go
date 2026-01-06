package workers

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

// TaskClient wraps asynq client for creating tasks
type TaskClient struct {
	client *asynq.Client
}

func NewTaskClient(redisAddr string) (*TaskClient, error) {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	return &TaskClient{client: client}, nil
}

func (c *TaskClient) Close() error {
	return c.client.Close()
}

// EnqueueProcessSMS enqueues an SMS processing task
func (c *TaskClient) EnqueueProcessSMS(smsID uuid.UUID) error {
	payload, err := json.Marshal(ProcessSMSPayload{SMSID: smsID})
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeProcessSMS, payload)

	// Enqueue with default options (immediate processing, with retries)
	info, err := c.client.Enqueue(task, asynq.MaxRetry(3), asynq.Queue("default"))
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	fmt.Printf("Enqueued task: id=%s queue=%s\n", info.ID, info.Queue)
	return nil
}
