# Client Communication & Evidence Workflow

## Overview

COMPLYOS Client Communication system enables CA firms to manage client interactions, track document requests, and maintain evidence of compliance work.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  /communications → Thread List                                  │
│  /communications/[id] → Thread Detail with Messages             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CA Service (NestJS)                           │
│  CommunicationController + CommunicationService                  │
│  EvidenceRequest Management                                     │
│  AI Integration for Summaries                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                        │
│  communication_threads                                          │
│  communication_messages                                         │
│  evidence_requests                                              │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Thread Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/communications` | List | Get threads with filters (workspaceId, status, type) |
| `POST /api/communications` | Create | Create new thread |
| `GET /api/communications/stats` | Stats | Thread statistics by status |
| `GET /api/communications/:id` | Get | Thread with messages |
| `PUT /api/communications/:id/status` | Update | Change thread status |
| `PUT /api/communications/:id/assign` | Assign | Assign thread to user |
| `GET /api/communications/:id/summary` | AI Summary | Get thread data for AI summarization |

### Message Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/:id/messages` | Add | Add message to thread |
| `GET /api/communications/:id/messages` | List | Get thread messages |

### Evidence Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/evidence` | Create | Create evidence request |
| `GET /api/communications/evidence` | List | List evidence requests |
| `PUT /api/communications/evidence/:id/status` | Update | Update evidence status |

### Integrations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/from-notice/:id` | From Notice | Create thread from notice with evidence request |

## Core Entities

### CommunicationThread

Central hub for client interactions:

```prisma
model CommunicationThread {
  id          String @id @default(uuid())
  tenantId    String
  workspaceId String
  businessId  String?

  subject      String
  type         CommunicationType  // NOTICE, TASK, DOCUMENT_REQUEST, GENERAL, APPROVAL
  status       ThreadStatus     // OPEN, WAITING_CLIENT, WAITING_INTERNAL, RESOLVED
  priority     TaskPriority

  createdBy    String
  assignedTo   String?
  noticeId     String?
  taskId       String?
  documentId   String?

  aiSummary    String?
  resolvedAt   DateTime?

  messages     CommunicationMessage[]
  evidenceRequests EvidenceRequest[]
}
```

### CommunicationMessage

Individual messages within a thread:

```prisma
model CommunicationMessage {
  id          String @id @default(uuid())
  tenantId    String
  threadId    String

  senderId    String
  senderRole  String  // "ca", "client", "system", "ai"
  senderName  String

  message     String
  messageType MessageType  // TEXT, SYSTEM, DOCUMENT, AI_SUMMARY

  isInternalNote Boolean @default(false)  // Only visible to CA/internal
  documentId     String?
  correlationId  String?
}
```

### EvidenceRequest

Track document requests from clients:

```prisma
model EvidenceRequest {
  id          String @id @default(uuid())
  tenantId    String
  threadId    String?

  title       String
  description String?
  dueDate     DateTime?

  status      EvidenceStatus  // REQUESTED, UPLOADED, VERIFIED, REJECTED
  documentId  String?
  uploadedAt  DateTime?
  verifiedAt  DateTime?
  verifiedBy  String?
  rejectReason String?

  requesterId String
  workspaceId String
  noticeId    String?
  taskId      String?
}
```

## Role Visibility Rules

### Internal Notes

| Role | View Internal Notes | Create Internal Note |
|------|--------------------|--------------------|
| CLIENT | ❌ | ❌ |
| CA | ✅ | ✅ |
| ADMIN | ✅ | ✅ |
| VIEWER | ❌ | ❌ |

**Implementation:**
- `CommunicationService.getThread()` accepts `includeInternal` parameter
- Controller checks `req.user.role === 'CA' || req.user.role === 'ADMIN'`
- Public API (for clients) always passes `includeInternal: false`

### Message Visibility Matrix

| Message Type | CLIENT | CA | ADMIN |
|--------------|--------|-----|-------|
| TEXT (public) | ✅ | ✅ | ✅ |
| TEXT (internal) | ❌ | ✅ | ✅ |
| SYSTEM | ✅ | ✅ | ✅ |
| DOCUMENT | ✅ | ✅ | ✅ |
| AI_SUMMARY | ✅ | ✅ | ✅ |

### Evidence Requests

| Action | CLIENT | CA | ADMIN |
|--------|--------|-----|-------|
| View Requests | ✅ | ✅ | ✅ |
| Upload Document | ❌ | ✅ | ✅ |
| Verify/Reject | ❌ | ✅ | ✅ |
| Create Request | ❌ | ✅ | ✅ |

## Evidence Request Lifecycle

```
REQUESTED ──────────────┐
    │                   │
    │ (client uploads)  │
    ▼                   │
 UPLOADED               │
    │                   │
    ├──── (accept) ────▶│
    │                   │
    └──── (reject) ────▶│
    │                   │
    │ (re-upload)       │
    └───────────────────┘
         │
         ▼
     REJECTED
```

**Status Flow:**
1. **REQUESTED**: CA creates document request
2. **UPLOADED**: Client uploads document (via external system - not in v1)
3. **VERIFIED**: CA verifies document is acceptable
4. **REJECTED**: CA rejects with reason (can be re-requested)

**Implementation Notes:**
- Evidence requests can exist without a thread (standalone requests)
- Linking to thread is optional but recommended
- `updatedAt` timestamp tracks last modification

## Status Workflow

```
OPEN ───────────────────────────────┐
    │                               │
    ▼                               │
WAITING_CLIENT ─────────────────────┼──▶ RESOLVED
    │                               │
    ▼                               │
WAITING_INTERNAL ───────────────────┘
```

| Status | Description |
|--------|-------------|
| OPEN | Thread created, awaiting action |
| WAITING_CLIENT | Sent request to client, awaiting response |
| WAITING_INTERNAL | Client responded, CA working on it |
| RESOLVED | Matter resolved (sets `resolvedAt` timestamp) |

## Notice Integration

When a GST/Income Tax notice is received:

1. **Create Thread**: `POST /api/communications/from-notice/:noticeId`
2. **Auto-creates**:
   - Thread with subject from notice
   - Initial system message
   - Evidence request for required documents
3. **Thread linked** to notice for reference

## AI Integration

### Thread Summarization

```typescript
// GET /api/communications/:id/summary
{
  threadId: string
  messageCount: number
  messageSummary: string  // Concatenated messages
  subject: string
  status: string
  type: string
}
```

### AI Logging

All AI-generated summaries logged to `AIActionLog` with:
- `promptType`: `COMPLIANCE_ADVICE`
- `entityType`: `NOTICE` or `TASK`
- `correlationId` linking message to AI call

### Feature Flag

AI features respect `ENABLE_AI_FEATURES` environment variable:
- `false`: Mock responses only
- `true`: Full AI (OpenAI, local Ollama, or mock)

## Security & RBAC

### Tenant Isolation

- All queries filtered by `tenantId`
- Users can only access their tenant's data
- Cross-tenant access returns `NotFoundException`

### Workspace Access

- Users must be workspace member to access threads
- Workspace-level access control enforced in service layer

## Seed Data

### Sample Threads

1. **GST Notice Thread** (`thread-notice-followup-001`)
   - Type: NOTICE
   - Status: WAITING_CLIENT
   - Linked to GST Scrutiny Notice
   - Messages: CA explanation, document request, client acknowledgment
   - Internal note visible to CA only

2. **Quarterly Review** (`thread-general-001`)
   - Type: GENERAL
   - Status: OPEN
   - Messages: Client inquiry, CA internal note

### Evidence Requests

- Bank Statements FY 2024-25 (REQUESTED)
- Purchase Invoices - Mismatch Period (REQUESTED)

## Current Limitations

### In Scope (v1.0)
- ✅ Communication threads with messages
- ✅ Internal notes (CA/ADMIN only)
- ✅ Evidence request tracking
- ✅ Notice integration
- ✅ AI summary endpoint
- ✅ Tenant isolation
- ✅ Basic seed data

### Out of Scope (v1.0)
- ❌ Real email integration
- ❌ WhatsApp/business chat sync
- ❌ WebSocket real-time chat
- ❌ Push notifications
- ❌ File upload infrastructure (link to existing DocumentVault)
- ❌ Client portal view
- ❌ Template messages
- ❌ Scheduled reminders
- ❌ Message reactions/emoji
- ❌ Thread tagging/categories
- ❌ Bulk message operations

## Future Integrations

### Email Integration (Planned)
```
Client Email → COMPLYOS Mail Ingestion → CommunicationThread
                                    ↓
                           AI Classification
                           (Notice vs General)
                                    ↓
                           Assign to CA/Update Status
```

**Implementation:**
- Webhook endpoint for incoming emails
- Email-to-thread mapping via `senderEmail` matching
- Auto-create thread for new sender threads

### WhatsApp Integration (Planned)
```
WhatsApp Business API → COMPLYOS Webhook → CommunicationThread
```

**Challenges:**
- Phone number matching to users
- Message format normalization
- Attachment handling

### Client Portal (Planned)
- Read-only thread view for clients
- Document upload interface
- Response capability
- No internal note visibility

## Testing

### Unit Tests
- `communication.spec.ts` covers:
  - Thread CRUD operations
  - Internal note visibility filtering
  - Tenant isolation enforcement
  - Evidence request lifecycle
  - Status management
  - Thread stats aggregation

### Test Commands
```bash
npm run test --workspace=apps/ca-service -- communication.spec
```

## Migration Notes

### New Tables
- `communication_threads`
- `communication_messages`
- `evidence_requests`

### Schema Changes
- Added `communicationThreads[]` relations to: Tenant, User, ClientWorkspace, Business, Notice, ComplianceTask, DocumentVault
- Added `communicationMessages[]` relation to User
- Added `evidenceRequests[]` relation to Tenant, User

### Backward Compatibility
- No breaking changes to existing APIs
- Existing notices/tasks unaffected
- Works with existing DocumentVault documents

## Rollback Notes

To rollback this feature:

1. **Database**: Drop new tables (if no production data):
   ```sql
   DROP TABLE IF EXISTS evidence_requests;
   DROP TABLE IF EXISTS communication_messages;
   DROP TABLE IF EXISTS communication_threads;
   ```

2. **Remove Relations**: Remove array relations added to existing models

3. **Code Removal**:
   - Delete `communication.service.ts`
   - Delete `communication.controller.ts`
   - Remove from `app.module.ts`
   - Remove frontend pages

4. **Seed Data**: Re-run seed without communication data

---

*Last Updated: 2026-05-22*
*Version: 1.0.0*