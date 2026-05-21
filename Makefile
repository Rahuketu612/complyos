# COMPLYOS Makefile
# Convenience commands for local development

.PHONY: help setup migrate seed dev verify clean

help:
	@echo "COMPLYOS Development Commands"
	@echo ""
	@echo "  make setup     - Install dependencies and set up database"
	@echo "  make migrate - Run database migrations"
	@echo "  make seed    - Seed demo data"
	@echo "  make dev     - Start all services"
	@echo "  make verify  - Run E2E smoke tests"
	@echo "  make clean   - Stop all services"
	@echo ""

setup:
	@echo "Installing dependencies..."
	@cd apps/auth-service && npm install
	@cd apps/business-service && npm install
	@cd apps/api-gateway && npm install
	cd apps/web && npm install
	@echo "Dependencies installed. Run 'make migrate' next."

migrate:
	@echo "Running migrations..."
	@cd apps/auth-service && npx prisma migrate dev --name init
	@cd apps/business-service && npx prisma migrate dev --name init
	@echo "Migrations complete. Run 'make seed' next."

seed:
	@echo "Seeding demo data..."
	@cd apps/auth-service && npm run seed:dev
	@echo "Demo data seeded!"

dev:
	@echo "Starting services..."
	@./scripts/dev-start.sh

verify:
	@echo "Running E2E smoke tests..."
	@chmod +x scripts/e2e-smoke.sh
	@./scripts/e2e-smoke.sh

clean:
	@echo "Cleaning up..."
	@cd infra/docker && docker-compose down
	@rm -f /tmp/complyos-services.pids
	@echo "Services stopped."