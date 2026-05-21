# COMPLYOS - AI Compliance Operating System

## System Overview

**Vision**: The Compliance Operating System for Indian Businesses

**Mission**: Build an AI-powered compliance intelligence platform where businesses, CAs, auditors, and enterprises can monitor statutory compliance, track notices, manage vendor risk, detect ITC risks, manage audit workflows, and interact with compliance using natural language AI.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLYOS PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │  WEB CLIENT     │  │  MOBILE APP      │  │  PUBLIC API              │   │
│  │  (Next.js)      │  │  (React Native)  │  │  (REST/OpenAPI)           │   │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────────┘   │
│           │                    │                       │                     │
│           └────────────────────┼───────────────────────┘                     │
│                                ▼                                             │
│                  ┌─────────────────────────────┐                                 │
│                  │    API GATEWAY           │                                 │
│                  │    (Kong/NestJS Gateway)  │                                 │
│                  └────────────┬──────────────┘                                 │
│                               │                                                │
│         ┌──────────┬─────────┼─────────┬──────────┐                          │
│         ▼          ▼         ▼         ▼          ▼                              │
│  ┌────────────┐┌────────┐┌───────┐┌────────┐┌────────┐┌─────────┐          │
│  │Auth Service││Business││GST    ││AI      ││Vendor  ││Document││Notifier │          │
│  │            ││Service ││Service││Service ││Service ││Service  ││Service  │          │
│  └────────────┘└────────┘└───────┘└────────┘└────────┘└─────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     MESSAGE QUEUE (Kafka/RabbitMQ)                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ PostgreSQL    │ │ Redis Cache  │ │  OpenSearch  │ │  Vector DB        │  │
│  │ (Primary DB) │ │ (Sessions)  │ │ (Documents)  │ │  (Embeddings)     │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Microservices Architecture

### Core Services

| Service | Technology | Purpose |
|---------|------------|---------|
| auth-service | NestJS | Authentication, JWT, MFA, RBAC |
| business-service | NestJS | Business profiles, entities |
| gst-service | NestJS | GST returns, notices, ledgers |
| vendor-service | NestJS | Vendor intelligence, GSTR-2B |
| ai-service | Python/FastAPI | AI assistant, RAG, NLP |
| document-service | NestJS | Document storage, OCR |
| notification-service | NestJS | Alerts, email, SMS, WhatsApp |
| audit-service | NestJS | Auditor collaboration |
| scoring-service | NestJS | Compliance scoring engines |
| reconciliation-service | NestJS | ITC reconciliation |

### Async Workers (Celery/Python)

- portal-sync-worker: Sync from GST portal, IT portal
- ocr-worker: Document OCR extraction
- alert-worker: Scheduled alerts and reminders
- risk-worker: ML risk scoring

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+, Python 3.11+
- **Framework**: NestJS, FastAPI
- **Database**: PostgreSQL 15+, Redis
- **Message Queue**: RabbitMQ
- **Search**: OpenSearch 2.x
- **Vector DB**: pgvector

### Frontend
- **Framework**: Next.js 14, React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: Zustand, React Query
- **Charts**: Recharts, Tremor

### Infrastructure
- **Container**: Docker, Kubernetes (EKS)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Cloud**: AWS (ECS, RDS, ElastiCache, OpenSearch)

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   SECURITY LAYER                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  • JWT with RS256 signing                             │
│  • Refresh token rotation                            │
│  • MFA (TOTP) support                               │
│  • OAuth 2.0 / OIDC ready                            │
│  • Role-Based Access Control (RBAC)                 │
│  • Tenant isolation via row-level security            │
│  • Audit logging on all sensitive operations       │
│  • TLS 1.3 termination                             │
│  • AES-256 encryption at rest                       │
│  • Secret vault (AWS Secrets Manager)               │
│  • Rate limiting per tenant/service                  │
│  • WAF-ready architecture                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Data Model Overview

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  TENANT     │────▶│  USER      │────▶│  BUSINESS   │
│  (org)      │     │            │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
       ┌───────────────┬───────────┬─────────────┬┴┐
       ▼               ▼           ▼             ▼
┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│REGISTRATION│ │ RETURNS  │ │ NOTICES  │ │ VENDORS  │
│(GST,TAN...)│ │(GSTR-1..)│ │           │ │          │
└────────────┘ └──────────┘ └──────────┘ └──────────┘
                                                    │
       ┌─────────────────────────┬───────────────────�─┘
       ▼                         ▼
┌──────────────┐        ┌──────────────┐
│GSTR2B_INVOICE│        │RECONCILIATION│
│             │        │             │
└──────────────┘        └──────────────┘
```

---

## Phase 1 MVP Scope

### What We Build Now

1. **Authentication & Multi-tenancy**
   - JWT auth with refresh tokens
   - Organization management
   - Basic RBAC (admin, user, auditor)

2. **GST Dashboard**
   - Return filing status
   - Notice overview
   - Payment tracking

3. **GSTR-2B Vendor Intelligence**
   - Vendor listing with compliance scores
   - ITC exposure tracking
   - Invoice reconciliation

4. **AI Assistant**
   - RAG-based compliance Q&A
   - Notice explanation
   - Multilingual support

5. **Compliance Timeline**
   - Chronological event feed
   - Filing history
   - Notice tracking

### What Comes Later (Phases 2-3)

- TRACES, EPFO, ESIC connectors
- Advanced ML risk prediction
- Compliance graph
- WhatsApp alerts

---

## Folder Structure

```
/workspace/project/
├── apps/
│   ├── api-gateway/          # NestJS API Gateway
│   ├── auth-service/        # Authentication microservice
│   ├── business-service/   # Business profiles
│   ├── gst-service/         # GST intelligence
│   ├── vendor-service/      # Vendor intelligence
│   ├── ai-service/        # Python AI/RAG service
│   └── web/              # Next.js frontend
│
├── packages/
│   ├── database/          # Prisma schema, migrations
│   ├── ui/               # Shared React components
│   ├── tsconfig/         # TypeScript configs
│   └── eslint/          # ESLint configs
│
├── infra/
│   ├── terraform/        # AWS infrastructure
│   ├── kubernetes/       # K8s manifests
│   └── docker/          # Dockerfiles
│
├── docs/
│   └── architecture/      # Architecture docs
│
└── README.md
```

---

## API Contracts (MVP)

### Auth APIs
- `POST /auth/register` - Register organization
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Business APIs
- `GET /businesses` - List businesses
- `POST /businesses` - Create business
- `GET /businesses/:id` - Get business details
- `PATCH /businesses/:id` - Update business

### GST APIs
- `GET /gst/returns` - List GST returns
- `GET /gst/notices` - List GST notices
- `GET /gst/ledger` - Get GST ledger

### Vendor APIs
- `GET /vendors` - List vendors
- `GET /vendors/:id` - Vendor details with score
- `GET /vendors/:id/invoices` - GSTR-2B invoices
- `GET /vendors/reconciliation` - ITC reconciliation

### AI APIs
- `POST /ai/chat` - Chat with AI assistant
- `POST /ai/analyze-notice` - Analyze GST notice
- `GET /ai/insights` - Compliance insights

---

## Infrastructure Setup

### Development Environment
- Docker Compose with all services
- Local PostgreSQL, Redis, OpenSearch
- VSCode dev container ready

### Staging/Production
- EKS cluster on AWS
- RDS PostgreSQL
- ElastiCache Redis
- OpenSearch domain
- ECS Fargate for services

---

## Compliance & Security Standards

Target certifications:
- SOC2 Type II
- ISO27001
- DPDP Act (India) compliance

AI Safety requirements:
- All AI responses source-backed
- Hallucination prevention via RAG
- Confidence scoring
- Legal disclaimer layer

---

## Next Steps

1. Initialize monorepo with Turborepo
2. Set up Prisma schema with all entities
3. Implement auth service with JWT
4. Build business profile engine
5. Create GST intelligence service
6. Build vendor intelligence service
7. Implement AI service with RAG
8. Build Next.js frontend
9. Set up Docker Compose
10. Configure CI/CD pipeline