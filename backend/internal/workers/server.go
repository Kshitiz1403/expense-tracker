package workers

import (
	"expense-tracker/internal/config"
	"expense-tracker/internal/services"
	"log"

	"github.com/hibiken/asynq"
)

// Server wraps asynq server for processing tasks
type Server struct {
	server  *asynq.Server
	mux     *asynq.ServeMux
	handler *SMSTaskHandler
}

func NewServer(cfg *config.Config, processor *services.TransactionProcessor) *Server {
	// Create Redis connection config
	redisOpt := asynq.RedisClientOpt{
		Addr: cfg.Redis.Addr,
	}
	if cfg.Redis.Password != "" {
		redisOpt.Password = cfg.Redis.Password
	}

	// Create server with configuration
	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10, // Number of concurrent workers
			Queues: map[string]int{
				"critical": 6, // 60% of workers
				"default":  3, // 30% of workers
				"low":      1, // 10% of workers
			},
			// Graceful shutdown timeout
			ShutdownTimeout: 30,
		},
	)

	// Create task handler
	handler := NewSMSTaskHandler(processor)

	// Create mux and register handlers
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeProcessSMS, handler.HandleProcessSMS)

	return &Server{
		server:  server,
		mux:     mux,
		handler: handler,
	}
}

// Start begins processing tasks
func (s *Server) Start() error {
	log.Println("Starting asynq worker server...")
	if err := s.server.Start(s.mux); err != nil {
		return err
	}
	return nil
}

// Stop gracefully shuts down the server
func (s *Server) Stop() {
	log.Println("Shutting down asynq worker server...")
	s.server.Shutdown()
}
