#!/bin/bash
# Docker Health Check Script
# Usage: ./scripts/docker-health-check.sh

set -e

echo "=== COMPLYOS Docker Health Check ==="
echo ""

# Check docker/docker-compose availability
if command -v docker &> /dev/null; then
    echo "✓ Docker is available"
    docker --version
else
    echo "✗ Docker is not installed"
    exit 1
fi

if command -v docker compose &> /dev/null; then
    echo "✓ Docker Compose is available"
elif command -v docker-compose &> /dev/null; then
    echo "✓ Docker Compose is available (legacy)"
else
    echo "✗ Docker Compose is not installed"
    exit 1
fi

echo ""
echo "=== Validating docker-compose.yml ==="

cd "$(dirname "$0")/.."

if docker compose config --quiet; then
    echo "✓ docker-compose.yml is valid"
else
    echo "✗ docker-compose.yml has syntax errors"
    docker compose config 2>&1 | head -20
    exit 1
fi

echo ""
echo "=== Service Dependency Graph ==="
echo "postgres (db) ──┬──> auth-service"
echo "               ├──> business-service ──> gst-service"
echo "               ├──> vendor-service"
echo "               └──> ca-service ──> redis"
echo "redis (cache) ──┬──> ca-service"
echo "               └──> auth-service"
echo ""
echo "All services must wait for postgres + redis health checks"
echo ""

echo "=== Required Ports ==="
echo "5432 - PostgreSQL"
echo "6379 - Redis"
echo "3000 - API Gateway"
echo "3001 - Auth Service"
echo "3002 - Business Service"
echo "3003 - GST Service"
echo "3004 - Vendor Service"
echo "3007 - CA Service"
echo "3005 - Web Frontend"
echo ""

echo "=== Health Check Commands ==="
echo "curl http://localhost:3000/health           # API Gateway"
echo "curl http://localhost:3001/health          # Auth Service"
echo "curl http://localhost:3007/health           # CA Service"
echo "curl http://localhost:3007/health/queues    # Queue Health"
echo "curl http://localhost:3007/metrics          # Prometheus Metrics"
echo ""

echo "=== Start Commands ==="
echo "docker compose up -d        # Start all services"
echo "docker compose logs -f      # Follow logs"
echo "docker compose down          # Stop all services"
echo "docker compose ps            # Check status"
echo ""

echo "=== COMPLYOS Stack Ready ==="
