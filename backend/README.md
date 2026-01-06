# Expense Tracker Backend

A Go backend service for tracking expenses and income.

## Tech Stack

- Go 1.23
- Docker support for easy deployment

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/                # Private application code (TODO)
├── pkg/                     # Public packages (TODO)
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── go.mod
```

## Getting Started

### Prerequisites

- Go 1.23 or higher
- Docker and Docker Compose (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   make deps
   ```

2. **Build the application:**
   ```bash
   make build
   ```

3. **Run the application:**
   ```bash
   make run
   ```

### Using Docker

1. **Build and start with Docker Compose:**
   ```bash
   make docker-up
   ```

2. **View logs:**
   ```bash
   make docker-logs
   ```

3. **Stop the containers:**
   ```bash
   make docker-down
   ```

## Status

🚧 Project in early development phase. Core features coming soon.
