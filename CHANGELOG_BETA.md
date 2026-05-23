# CHANGELOG - Beta Release (v0.1.0-beta)

## Overview

This changelog covers all significant changes in the COMPLYOS Beta release (`feat/client-communication-workflow` branch).

---

## [0.1.0-beta] - 2026-05-23

### Added

#### Core Services
- **auth-service**: Multi-tenant authentication with JWT, session management, and RBAC
- **business-service**: Business entity registration, compliance tracking, applicability calculations
- **gst-service**: GST return filing (GSTR-1, 3B, 2A, 2B), notice management, ledger monitoring
- **vendor-service**: Vendor onboarding, compliance verification, payment tracking
- **ca-service**: Chartered Accountant client collaboration and workflow management
- **ai-service**: AI-powered compliance assistant with governance framework
- **api-gateway**: Unified API gateway with health checks

#### Shared Infrastructure
- **packages/shared**: Reusable modules for RBAC, Audit, Queue, and Encryption services
- **packages/database**: Consolidated Prisma schema with comprehensive compliance models

#### Frontend Features
- Dashboard with compliance overview
- Business management interface
- GST returns and notices management
- Vendor management portal
- CA client collaboration interface
- AI compliance assistant interface
- Client communication hub
- Document management
- Notification center
- Settings and workspace management

#### Compliance Coverage
- GST Filing: GSTR-1, GSTR-3B, GSTR-2A, GSTR-2B
- TDS Deductions: Section 192, 194, 194A, 194C, 194J, 194Q
- EPF/ESI Compliance
- Companies Act (Directors, AGM, PCA, Charges)
- LLP Annual Filing
- Customs & FDI Compliance

#### Security Features
- Tenant isolation with data scoping
- Session management with token family tracking
- Role-based access control (RBAC)
- Immutable audit logging
- File encryption service
- Input validation
- Rate limiting (Throttler)

#### Operational Scripts
- `docker-health-check.sh`: Docker container health validation
- `smoke-test.sh`: End-to-end smoke testing

#### Documentation
- AI Governance framework
- Audit immutability guidelines
- Background jobs documentation
- Beta onboarding guide
- CA client workflows
- Client communication workflow
- Compliance coverage roadmap
- Demo script
- Deployment guide
- Pilot feedback process
- Production readiness audit
- Product analytics
- RBAC matrix

### Changed

#### Database Schema
- Consolidated schema across all services
- Added compliance tracking models
- Enhanced audit logging schema
- Added communication and notice models
- Added AI governance models

#### Migration Files
- `20260522104016_init_baseline`: Initial schema
- `20260522105731_add_phase_one_compliance_foundations`: Compliance models
- `20260522112447_add_ca_client_collaboration_foundation`: CA features

### Fixed

- Auth service schema field mapping
- Business service throttler dependency
- Web service moduleResolution configuration
- Prisma client generation hooks
- Cross-service type imports

### Known Limitations

1. **Email Integration**: Real email notifications require SMTP configuration
2. **AI LLM Provider**: Production needs OpenAI/Anthropic API key
3. **File Storage**: Uses local filesystem; S3/GCS for production
4. **Payment Gateway**: Not integrated; invoice-based workflow
5. **E-Waybill**: Manual creation required

### Breaking Changes

None in beta release.

---

## Migration Guide

### Fresh Installation
```bash
npm install
npm run db:generate
npm run db:migrate
npm run start:dev
```

### Existing Database
Database migrations are forward-only. Ensure backup before running migrations.

---

## Deprecations

None in beta release.

---

## Security Notes

All security-sensitive features are documented in `docs/PRODUCTION_READINESS_AUDIT.md`.

---

*Generated on 2026-05-23*