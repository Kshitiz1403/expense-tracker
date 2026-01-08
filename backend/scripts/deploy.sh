#!/bin/bash
set -e

echo "🚀 Starting Expense Tracker Backend (Production Mode)"
echo "=================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required variables."
    echo "See .env.example for reference."
    exit 1
fi

# Load environment variables
source .env

# Build and start all services
echo "Building and starting all services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check health
echo "Checking service health..."
./scripts/health-check.sh

echo ""
echo "=================================================="
echo "✅ Production deployment complete!"
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:3049"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f backend"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo "=================================================="
