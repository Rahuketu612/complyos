#!/bin/bash
# COMPLYOS Local Development Startup Script
# Starts services in correct order with health checks

set -e

echo "=========================================="
echo "COMPLYOS Local Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_service() {
  local url=$1
  local name=$2
  local max_attempts=10
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      log_info "$name is ready"
      return 0
    fi
    log_warn "Waiting for $name... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
  done
  
  log_error "$name failed to start"
  return 1
}

# Start infrastructure
log_info "Starting Postgres and Redis..."
cd infra/docker
docker-compose up -d postgres redis

# Wait for Postgres
log_info "Waiting for Postgres..."
until docker exec postgres-db pg_isready -U complyos > /dev/null 2>&1; do
  log_warn "Waiting for Postgres..."
  sleep 2
done
log_info "Postgres is ready"

# Wait for Redis
log_info "Waiting for Redis..."
until docker exec redis-cache redis-cli ping > /dev/null 2>&1; do
  log_warn "Waiting for Redis..."
  sleep 2
done
log_info "Redis is ready"

# Run migrations (if needed)
log_info "Setting up database..."
cd ../apps/auth-service
npm run prisma:migrate 2>/dev/null || log_warn "Migration may already be applied"

cd ../business-service
npm run prisma:migrate 2>/dev/null || log_warn "Migration may already be applied"

# Seed demo data
log_info "Seeding demo data..."
cd ../auth-service
npm run seed:dev 2>/dev/null || log_info "Demo data may already exist"

# Start all services in background
log_info "Starting microservices..."

# Start auth-service
cd ../apps/auth-service
npm run start:dev > /tmp/auth-service.log 2>&1 &
AUTH_PID=$!
log_info "Started auth-service (PID: $AUTH_PID)"

# Check auth-service health
check_service "http://localhost:3001/auth/health" "auth-service"

# Start business-service
cd ../apps/business-service
npm run start:dev > /tmp/business-service.log 2>&1 &
BUSINESS_PID=$!
log_info "Started business-service (PID: $BUSINESS_PID)"

# Start api-gateway
cd ../apps/api-gateway
npm run start:dev > /tmp/api-gateway.log 2>&1 &
GATEWAY_PID=$!
log_info "Started api-gateway (PID: $GATEWAY_PID)"

# Check gateway health
check_service "http://localhost:3000/health" "api-gateway"

# Start web
cd ../apps/web
npm run dev > /tmp/web.log 2>&1 &
WEB_PID=$!
log_info "Started web (PID: $WEB_PID)"

log_info "=========================================="
log_info "All services started successfully!"
log_info "=========================================="
log_info ""
log_info "Services:"
log_info "  - Web:     http://localhost:3000"
log_info "  - Gateway: http://localhost:3000"
log_info "  - Auth:    http://localhost:3001"
log_info "  - Business: http://localhost:3002"
log_info ""
log_info "Demo credentials:"
log_info "  Email:    demo@complyos.dev"
log_info "  Password: DemoPassword123!"
log_info ""
log_info "Run './scripts/e2e-smoke.sh' to verify setup"

# Save PIDs for reference
echo "$AUTH_PID $BUSINESS_PID $GATEWAY_PID $WEB_PID" > /tmp/complyos-services.pids