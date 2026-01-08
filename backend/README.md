# Expense Tracker Backend

AI-powered expense tracking system that processes SMS transactions via webhook and extracts transaction details using LLM.

## Features

- 📱 SMS wecho "=================================================="
echo "✅ Production deployment complete!"
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:3049"
echo "  - PostgreSQL: Internal only (not exposed)"
echo "  - Redis: Internal only (not exposed)"cked job queue (Asynq)
- 🐳 Docker & Docker Compose ready
- 🔄 Automatic retries and error handling
- 🎯 90% confidence threshold for auto-approval

## Quick Start

### Development (Local Go Server)

1. **Start Dependencies**
   ```bash
   ./scripts/dev-start.sh
   ```
   This starts PostgreSQL and Redis in Docker.

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run Backend**
   ```bash
   go run cmd/api/main.go
   ```

### Production (Full Docker)

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Deploy**
   ```bash
   ./scripts/deploy.sh
   ```

This builds and starts all services (backend + postgres + redis).

## Docker Compose Files

- **`docker-compose.yml`**: Full stack (backend + postgres + redis) - for production
- **`docker-compose.dev.yml`**: Just databases (postgres + redis) - for development

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/ping` | API status |
| POST | `/api/webhooks/sms` | Receive SMS webhooks |

## Environment Variables

See `.env.example` for all configuration options:

- **Database**: PostgreSQL connection
- **Redis**: Asynq job queue
- **LLM**: Provider (openai/anthropic), API key, model
- **SMS**: Webhook configuration

## Architecture

```
SMS Gateway → Webhook → Asynq Queue → Worker
                                        ↓
                            SMS Parser → AI Service
                                        ↓
                                 Transaction DB
```

## Development

```bash
# Install dependencies
go mod download

# Run tests
go test ./...

# Build
go build -o server cmd/api/main.go

# Run with hot reload (using air)
air
```

## Deployment

### Manual Deploy
```bash
docker compose up -d --build
```

### Health Check
```bash
./scripts/health-check.sh
```

### View Logs
```bash
docker compose logs -f backend
```

### Stop Services
```bash
docker compose down
```

## Database Migrations

Migrations are automatically applied on startup via GORM AutoMigrate.

To enable UUID extension:
```sql
-- migrations/000_enable_uuid.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Database**: PostgreSQL 16
- **ORM**: GORM
- **Cache/Queue**: Redis 7
- **Job Queue**: Asynq
- **AI**: langchaingo (OpenAI, Anthropic)
- **Containerization**: Docker, Docker Compose

## Project Structure

```
backend/
├── cmd/api/              # Application entry point
├── internal/
│   ├── config/          # Configuration
│   ├── handlers/        # HTTP handlers
│   ├── models/          # Database models
│   ├── repository/      # Data access layer
│   ├── services/        # Business logic
│   └── workers/         # Asynq workers
├── migrations/          # Database migrations
├── scripts/             # Deployment scripts
├── docker-compose.yml   # Full stack (production)
├── docker-compose.dev.yml # Databases only (dev)
└── Dockerfile          # Multi-stage Go build
```

## License

MIT
