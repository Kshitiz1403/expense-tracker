package workers

import (
	"context"
	"expense-tracker/internal/services"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

// WorkerServer wraps the River client for consuming jobs.
type WorkerServer struct {
	riverClient *river.Client[pgx.Tx]
}

// NewWorkerServer creates a River client with registered workers.
// Returns both the WorkerServer and the shared River client (for use by TaskClient).
func NewWorkerServer(pool *pgxpool.Pool, processor *services.TransactionProcessor) (*WorkerServer, *river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	if processor != nil {
		river.AddWorker(workers, NewSMSWorker(processor))
	}

	riverClient, err := river.NewClient(riverpgxv5.New(pool), &river.Config{
		Queues:  map[string]river.QueueConfig{"sms": {MaxWorkers: 10}},
		Workers: workers,
	})
	if err != nil {
		return nil, nil, err
	}

	return &WorkerServer{riverClient: riverClient}, riverClient, nil
}

// Start begins consuming jobs from the queue.
func (s *WorkerServer) Start(ctx context.Context) error {
	log.Println("Starting River worker server...")
	return s.riverClient.Start(ctx)
}

// Stop gracefully shuts down the worker.
func (s *WorkerServer) Stop(ctx context.Context) {
	log.Println("Shutting down River worker server...")
	if err := s.riverClient.Stop(ctx); err != nil {
		log.Printf("Error stopping River worker: %v", err)
	}
}
