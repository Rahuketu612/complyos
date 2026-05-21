# COMPLYOS - AI Compliance Platform

Enterprise-grade AI-powered compliance intelligence platform for Indian businesses.

## Overview

COMPLYOS aggregates data from Indian statutory portals (GST, IT, EPFO, ESIC, TRACES) to create a unified compliance identity. Features AI assistants for notice analysis, vendor risk monitoring, and predictive compliance alerts.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Frontend (Next.js 14)               │
│            http://localhost:3005                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               API Gateway (NestJS)                   │
│            http://localhost:3000                     │
└─────────────────────────────────────────────────────┘
           │      │       │       │        │
           ▼      ▼       ▼       ▼        ▼
┌─────────┬───┬─────┬───┬─────┬───┬─────────┐
│  Auth   │Biz │ GST │Vendor│ AI │  etc    │
│ :3001  │:3002│:3003│:3004│:3005│         │
└────────┴─────┴─────┴─────┴─────┴─────────┘
     │                              │
     ▼                              ▼
 PostgreSQL 15                    Redis 7
```

## Services & Ports

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| web | 3005 | Next.js 14 | Frontend dashboard |
| api-gateway | 3000 | NestJS | Route aggregation |
| auth-service | 3001 | NestJS | JWT auth, MFA |
| business-service | 3002 | NestJS | Business profiles |
| gst-service | 3003 | NestJS | GST intelligence |
| vendor-service | 3004 | NestJS | Vendor risk scoring |
| ai-service | 3006 | Python/FastAI | AI assistant |

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query
- **Backend**: NestJS, TypeScript, PostgreSQL, Redis, Kafka
- **AI**: Python, FastAPI, LangChain, OpenAI GPT-4
- **Infrastructure**: Docker, Kubernetes, AWS

## Quick Start

### Prerequisites
- Node.js 20 LTS
- Docker & Docker Compose

### Docker (All Services)
```bash
cd infra/docker
docker-compose up -d
```

### Manual
```bash
# Backend services
for svc in auth business gst vendor; do
  cd apps/${svc}-service && npm install && npm run build
done

# Frontend
cd apps/web && npm install && npm run build

# Start
cd apps/api-gateway && node dist/main.js  # :3000
cd apps/web && npm run dev                # :3005
```

See `SETUP.md` for full instructions.

## Verification

```bash
# Health
curl http://localhost:3000/api/health
# Frontend
curl http://localhost:3005
curl http://localhost:3005/dashboard
```

## Repo

https://github.com/Rahuketu612/complyos

## Limitations

- Docker daemon requires elevated permissions
- Full-stack local dev needs PostgreSQL + Redis running
- See `VERIFICATION.md` for detailed testing

## License

Proprietary