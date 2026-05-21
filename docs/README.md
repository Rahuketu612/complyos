# COMPLYOS - AI Compliance Operating System

[ARCHIVED CONTENT - See docs/architecture/system-overview.md for latest]

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+

### Environment Setup

1. Clone repository
2. Copy `.env.example` to `.env`
3. Update database credentials
4. Run Docker Compose:
   ```bash
   cd infra/docker
   docker-compose up -d
   ```

### Database Setup

```bash
# Run migrations
psql -h localhost -U complyos -d complyos -f packages/database/migrations/001_initial.sql
```

### Running Services

```bash
# Auth Service
cd apps/auth-service
npm install
npm run start:dev

# Business Service  
cd apps/business-service
npm install
npm run start:dev

# Other services follow same pattern

# AI Service
cd apps/ai-service
pip install -r requirements.txt
python main.py
```

### API Documentation

- Auth: http://localhost:3001/docs
- Business: http://localhost:3002/docs
- GST: http://localhost:3003/docs
- Vendor: http://localhost:3004/docs
- AI: http://localhost:3005/docs

## Tech Stack

- **Backend**: NestJS, FastAPI, Python
- **Database**: PostgreSQL, Redis
- **Search**: OpenSearch
- **AI**: OpenAI GPT, LangChain
- **Frontend**: Next.js (in progress)

## License

Proprietary - All Rights Reserved