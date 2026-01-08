#!/bin/bash
set -e

echo "🚀 Starting Expense Tracker Backend (Development Mode)"
echo "=================================================="

# Stop any running containers
echo "Stopping existing containers..."
docker compose -f docker-compose.dev.yml down

# Start PostgreSQL and Redis only
echo "Starting PostgreSQL and Redis..."
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker ps | grep -q expense_tracker_db; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

if docker ps | grep -q expense_tracker_redis; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed to start"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Development environment ready!"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Run your Go backend with:"
echo "  go run cmd/api/main.go"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.dev.yml down"
echo "=================================================="
