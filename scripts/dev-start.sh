#!/bin/bash
# COMPLYOS Local Development Startup Script
# Starts services in correct order with health checks
# Can run with or without Docker

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

# Check if we have the services already running
check_existing() {
  log_info "Checking for existing services..."
  
  if curl -sf http://localhost:3000/api/ > /dev/null 2>&1; then
    log_warn "Gateway already running on 3000"
    ALREADY_RUNNING=1
  fi
  
  if curl -sf http://localhost:3001/auth/health > /dev/null 2>&1; then
    log_warn "Auth service already running on 3001"
    AUTH_RUNNING=1
  fi
}

# Start infrastructure only if Docker available
start_infra() {
  if ! command -v docker >/dev/null 2>&1; then
    log_warn "Docker not available - assuming local Postgres/Redis"
    return 1
  fi
  
  if ! docker ps >/dev/null 2>&1; then
    log_warn "Docker daemon not running"
    return 1
  fi
  
  log_info "Starting Postgres and Redis..."
  cd infra/docker
  docker-compose up -d postgres redis 2>/dev/null || log_warn "Could not start Docker services"
  return 0
}

# Run migrations
run_migrations() {
  log_info "Running database migrations..."
  
  for svc in auth-service business-service; do
    if [ -d "apps/$svc" ]; then
      (cd "apps/$svc" && npx prisma migrate dev --name init 2>/dev/null) || \
        log_warn "Migration may already be applied for $svc"
    fi
  done
}

# Seed demo data
seed_data() {
  log_info "Seeding demo data..."
  
  if [ -d "apps/auth-service" ]; then
    (cd apps/auth-service && npm run seed:dev 2>/dev/null) || \
      log_info "Demo data may already exist"
  fi
}

# Start a service
start_service() {
  local svc_dir=$1
  local port=$2
  local name=$3
  
  # Check if already running
  if curl -sf "http://localhost:$port/" > /dev/null 2>&1; then
    log_warn "$name already running"
    return 0
  fi
  
  log_info "Starting $name..."
  
  if [ ! -d "$svc_dir" ]; then
    log_error "$svc_dir not found"
    return 1
  fi
  
  cd "$svc_dir"
  
  # Start in background
  if [ -f "package.json" ]; then
    npm run start:dev > "/tmp/${name}.log" 2>&1 &
    log_info "Started $name (check /tmp/${name}.log for output)"
  fi
  
  cd - > /dev/null
}

# Main
check_existing

# Only attempt Docker infra if services aren't already running
if [ -z "$ALREADY_RUNNING" ] && [ -z "$AUTH_RUNNING" ]; then
  start_infra || log_warn "Skipping Docker - using local/remote services"
fi

# Try migrations (may fail if DB unavailable)
run_migrations 2>/dev/null || true

# Seed (may fail if DB unavailable)
seed_data 2>/dev/null || true

# Start services if not running
if [ -z "$AUTH_RUNNING" ]; then
  start_service "apps/auth-service" 3001 "auth-service" || true
  check_service "http://localhost:3001/auth/health" "auth-service" || log_warn "Auth service may need manual startup"
fi

start_service "apps/business-service" 3002 "business-service" || true
start_service "apps/api-gateway" 3000 "api-gateway" || true
start_service "apps/web" 3005 "web" || true

log_info "=========================================="
log_info "Setup complete!"
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