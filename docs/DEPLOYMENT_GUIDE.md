# COMPLYOS Deployment Guide
## Beta Launch Configuration

---

## Prerequisites

- Node.js 20.x
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+ (optional for queues)

---

## Quick Start (Local)

### 1. Clone & Install

```bash
git clone https://github.com/Rahuketu612/complyos.git
cd complyos
npm install
```

### 2. Environment Setup

Create `.env` files in each service:

```bash
# Root .env
DATABASE_URL=postgresql://complyos:complyos_dev_password@localhost:5432/complyos
JWT_SECRET=your-32-char-minimum-secret-key-here
JWT_REFRESH_SECRET=another-32-char-minimum-secret
REDIS_URL=redis://localhost:6379
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed
```

### 4. Build & Run

```bash
# Build all services
npm run build

# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Run services (in separate terminals)
npm run start:dev --workspace=@complyos/auth-service
npm run start:dev --workspace=@complyos/ca-service
npm run start:dev --workspace=@complyos/vendor-service
npm run start:dev --workspace=@complyos/business-service
npm run start:dev --workspace=@complyos/gst-service
npm run start:dev --workspace=@complyos/api-gateway

# Start web (Next.js)
npm run dev --workspace=@complyos/web
```

---

## Docker Compose Setup

### Start All Services

```bash
cd complyos
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Service URLs

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| Business Service | http://localhost:3002 |
| GST Service | http://localhost:3003 |
| Vendor Service | http://localhost:3004 |
| CA Service | http://localhost:3007 |
| Web Frontend | http://localhost:3005 |

### Health Endpoints

```bash
curl http://localhost:3000/health          # API Gateway
curl http://localhost:3001/health         # Auth Service
curl http://localhost:3007/health        # CA Service
curl http://localhost:3007/health/queues # Queue Health
curl http://localhost:3007/metrics        # Prometheus Metrics
```

---

## Demo Data

### Seed the Database

```bash
npm run db:seed
```

### Demo Credentials

```
Email: demo@complyos.com
Password: Demo@123
```

### Demo Data Includes

- 1 CA Firm (Sharma & Associates)
- 5 Client Businesses with varying compliance scores
- 10 Compliance Tasks (2 overdue)
- 4 GST Notices (1 critical)
- 3 Communication Threads
- 3 MSME Vendors with overdue invoices
- AI Insights
- Notifications
- Sample Documents

---

## Environment Variables

### Required for All Services

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Service port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing secret | Min 32 chars |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

### Service-Specific

**Auth Service:**
- `JWT_REFRESH_SECRET`: Refresh token signing

**Business Service:**
- `AUTH_SERVICE_URL`: Auth service endpoint

**GST Service:**
- `BUSINESS_SERVICE_URL`: Business service endpoint

**CA Service:**
- `SCHEDULER_ENABLED`: Enable cron jobs (`true`/`false`)

---

## Production Recommendations

### Infrastructure

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 50 GB | 100+ GB SSD |
| PostgreSQL | 2 GB RAM | 4+ GB RAM |
| Redis | 512 MB | 1+ GB |

### PostgreSQL Tuning

```sql
-- Add to postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 100
```

### Redis Configuration

```bash
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1 save 300 10 save 60 10000
```

### Security Checklist

- [ ] Change default JWT secrets
- [ ] Enable HTTPS in production
- [ ] Configure CORS for allowed origins
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Configure backup for PostgreSQL

---

## Troubleshooting

### Build Failures

```bash
# Clear caches
rm -rf node_modules/.cache
npm run clean
npm install
npm run build
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test connection
redis-cli ping
```

### Common Errors

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` on DATABASE_URL | Check PostgreSQL is running |
| `Module not found` | Run `npm run db:generate` |
| `Prisma client error` | Run `npx prisma generate` |
| `Port already in use` | Kill process on port or change PORT |

---

## Monitoring

### Prometheus Metrics

Endpoint: `GET /metrics` on each service

Key metrics:
- `http_requests_total`: Request count
- `http_request_duration_seconds`: Latency
- `queue_jobs_total`: Job processing
- `notices_processed_total`: Business metric

### Health Checks

All services expose `/health` endpoint:
```json
{
  "status": "ok",
  "timestamp": "2026-05-22T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## Backup & Recovery

### Database Backup

```bash
# Create backup
pg_dump -Fc complyos > backup_$(date +%Y%m%d).dump

# Restore backup
pg_restore -d complyos backup_20260522.dump
```

### Docker Volumes

```bash
# Backup volume
docker run --rm -v complyos_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volume
docker run --rm -v complyos_postgres_data:/restore -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /restore
```

---

## Support

- **Documentation**: `/docs` folder
- **Demo Script**: `DEMO_SCRIPT.md`
- **Beta Onboarding**: `BETA_ONBOARDING.md`
- **Issues**: GitHub Issues

---

*Last updated: May 2026*
