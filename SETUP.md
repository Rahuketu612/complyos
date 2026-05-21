# COMPLYOS - Developer Setup Guide

## Demo Credentials (Development Only)

For local testing without registering a new organization:

| Field | Value |
|-------|-------|
| Email | `demo@complyos.dev` |
| Password | `DemoPassword123!` |

### Option 1: Using Makefile

```bash
# One-command setup
make setup migrate seed
make dev          # Start all services
make verify      # Run E2E tests
```

### Option 2: Manual Setup

```bash
cd apps/auth-service
npm install
# Use prisma@5.22.0 explicitly - Prisma 7 has breaking changes
npx prisma@5.22.0 migrate dev --name init
npm run seed:dev
cd ../api-gateway
npm run start:dev
```

### Verify Setup

```bash
make verify
# Or manually:
./scripts/e2e-smoke.sh
```

## Prerequisites

- **Node.js 20 LTS** (required - not compatible with Node 22+)
- Node.js 22+ issues with Prisma v5 engines - use Node 20
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL client (psql)

## Quick Start

### 1. Clone and Setup

```bash
cd /workspace/project
```

### 2. Start Infrastructure

```bash
cd infra/docker
docker-compose up -d postgres redis
```

Wait for containers to be healthy:
```bash
docker-compose ps
```

### 3. Run Database Migration

```bash
# Connect to postgres and run migration
psql -h localhost -U complyos -d complyos -f packages/database/migrations/001_initial.sql
```

Or apply via Prisma:
```bash
cd packages/database
npx prisma migrate dev --name init
```

### 4. Install Dependencies

```bash
# Node.js services
for dir in apps/*-service; do
  cd "$dir"
  npm install
  cd ../..
done
```

For AI service:
```bash
cd apps/ai-service
pip install -r requirements.txt
```

### 5. Configure Environment

Copy `.env.example` files and update:

```bash
# Auth service
cp apps/auth-service/.env.example apps/auth-service/.env
# Edit .env with your values

# Business service
cp apps/business-service/.env.example apps/business-service/.env

# GST service
cp apps/gst-service/.env.example apps/gst-service/.env

# Vendor service
cp apps/vendor-service/.env.example apps/vendor-service/.env

# AI service
cp apps/ai-service/.env.example apps/ai-service/.env
# ⚠️ Add your OPENAI_API_KEY
```

### 6. Start All Services

**Frontend (port 3005):**
```bash
cd apps/web
npm run dev
```

**Terminal 1 - Auth (port 3001):**
```bash
cd apps/auth-service
npm run start:dev
```

**Terminal 2 - Business (port 3002):**
```bash
cd apps/business-service
npm run start:dev
```

**Terminal 3 - GST (port 3003):**
```bash
cd apps/gst-service
npm run start:dev
```

**Terminal 4 - Vendor (port 3004):**
```bash
cd apps/vendor-service
npm run start:dev
```

**Terminal 5 - AI (port 3005):**
```bash
cd apps/ai-service
python main.py
# or: uvicorn main:app --host 0.0.0.0 --port 3005 --reload
```

### 7. Verify Health

```bash
curl http://localhost:3001/auth/health   # Auth
curl http://localhost:3002/health          # Business
curl http://localhost:3003/health         # GST
curl http://localhost:3004/health         # Vendor
curl http://localhost:3005/health         # AI

### 8. Verify TypeScript Compilation

```bash
# Explicit commands - DO NOT use loops
cd apps/auth-service && npx tsc --noEmit
cd apps/business-service && npx tsc --noEmit
cd apps/gst-service && npx tsc --noEmit
cd apps/vendor-service && npx tsc --noEmit
```

All services should compile without errors.

## API Documentation

- Auth: http://localhost:3001/docs
- Business: http://localhost:3002/docs
- GST: http://localhost:3003/docs
- Vendor: http://localhost:3004/docs
- AI: http://localhost:3005/docs

## Testing

### Integration Tests

Run basic API tests:

```bash
# Test 1: Register organization
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Corp",
    "email": "admin@test.com",
    "password": "SecurePass123!",
    "firstName": "Admin"
  }'

# Expected: { "accessToken": "...", "user": {...} }
```

Then use the accessToken for subsequent calls:

```bash
TOKEN="your-access-token"

# Test 2: Create Business
curl -X POST http://localhost:3002/businesses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Business",
    "pan": "AAAPL1234C",
    "gstin": "07AAAPL1234C1ZP",
    "entityType": "private_limited"
  }'

# Test 3: Create GST Return
curl -X POST http://localhost:3003/:businessId/gst/returns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "GSTR_1",
    "taxPeriod": "042025",
    "status": "filed",
    "totalLiability": 50000
  }'

# Test 4: Create Vendor  
curl -X POST http://localhost:3004/:businessId/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor",
    "gstin": "09AAABC1234C1Z5"
  }'

# Test 5: AI Chat
curl -X POST http://localhost:3005/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the GST filing deadlines?",
    "mode": "business_owner"
  }'
```

## Docker Compose (Alternative)

Run all services at once:

```bash
cd infra/docker
docker-compose up --build
```

**Services available at:**
- Auth: http://localhost:3001
- Business: http://localhost:3002
- GST: http://localhost:3003
- Vendor: http://localhost:3004
- AI: http://localhost:3005

## Environment Variables Reference

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| DATABASE_URL | All | PostgreSQL connection | postgresql://... |
| JWT_SECRET | Auth | JWT signing key | (required) |
| JWT_EXPIRES_IN | Auth | Token expiry | 15m |
| PORT | Service | Listen port | varies |
| OPENAI_API_KEY | AI | OpenAI key | - |
| ALLOWED_ORIGINS | All | CORS origins | * |

## Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :3001
# Kill or change PORT in .env
```

### Database Connection Failed
```bash
# Check postgres running
docker ps | grep postgres
# Restart if needed
docker-compose restart postgres
```

### Prisma Errors
```bash
# Reset DB
npx prisma migrate reset
# Or regenerate client
npx prisma generate
```

### Import Errors
Make sure `@complyos/shared` is published or use relative imports in development.