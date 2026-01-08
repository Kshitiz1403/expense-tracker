#!/bin/bash
set -e

echo "🔍 Checking service health..."
echo "=================================================="

# Check Backend
echo -n "Backend API: "
if curl -f -s http://localhost:3049/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
    exit 1
fi

# Check PostgreSQL
echo -n "PostgreSQL: "
if docker exec expense_tracker_db pg_isready -U expense_tracker > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
    exit 1
fi

# Check Redis
echo -n "Redis: "
if docker exec expense_tracker_redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
    exit 1
fi

echo "=================================================="
echo "✅ All services are healthy!"
