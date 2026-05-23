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
│  CommunicationController + CommunicationService                 │
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
  noticeId     String?  // Optional link to notice
  taskId       String?
  documentId   String?

  aiSummary    String?  // AI-generated summary
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
  senderName  String  // Cached for display

  message     String
  messageType MessageType  // TEXT, SYSTEM, DOCUMENT, AI_SUMMARY

  isInternalNote Boolean @default(false)  // Only visible to CA/internal
  documentId     String?
  correlationId  String?  // Links to AIActionLog for AI calls
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

## API Endpoints

### Thread Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/communications` | List | Get threads with filters |
| `POST /api/communications` | Create | Create new thread |
| `GET /api/communications/stats` | Stats | Thread statistics |
| `GET /api/communications/:id` | Get | Thread with messages |
| `PUT /api/communications/:id/status` | Update | Change status |
| `PUT /api/communications/:id/assign` | Assign | Assign to user |

### Message Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/:id/messages` | Add | Add message |
| `GET /api/communications/:id/messages` | List | Get messages |

### Evidence Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/evidence` | Create | Create evidence request |
| `GET /api/communications/evidence` | List | List evidence requests |
| `PUT /api/communications/evidence/:id/status` | Update | Update status |

### Integrations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/communications/from-notice/:id` | From Notice | Create thread from notice |
| `GET /api/communications/:id/summary` | AI Summary | Get thread summary |

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

- **OPEN**: Thread created, awaiting action
- **WAITING_CLIENT**: Sent request to client, awaiting response
- **WAITING_INTERNAL**: Client responded, CA working on it
- **RESOLVED**: Matter resolved

## Internal Notes

Internal notes are messages marked `isInternalNote: true`:
- Only visible to CA and ADMIN roles
- Not visible to clients
- Useful for:
  - CA team discussions
  - Strategy notes
  - Internal review comments
  - Compliance check reminders

## Evidence Tracking

### Status Flow

```
REQUESTED → UPLOADED → VERIFIED
                ↓
            REJECTED → REQUESTED (re-request)
```

### Operations

1. **Request Document**: CA creates EvidenceRequest
2. **Client Uploads**: Client uploads document → status = UPLOADED
3. **CA Reviews**: 
   - Verify if acceptable → status = VERIFIED
   - Reject with reason → status = REJECTED (can re-request)

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

## Security & RBAC

### Role-Based Access

| Role | View Internal Notes | Send Internal Notes | Manage Evidence |
|------|--------------------|--------------------|----------------|
| CLIENT | ❌ | ❌ | Upload only |
| CA | ✅ | ✅ | Full |
| ADMIN | ✅ | ✅ | Full |

### Tenant Isolation

- All queries filtered by `tenantId`
- Users can only access their tenant's data
- Workspace-level access enforced

## Frontend Components

### Thread List (`/communications`)

- Stats cards: total, open, waiting client, in progress, resolved, pending evidence
- Filter by status, type, search
- Thread cards showing:
  - Subject, type badge
  - Workspace, business
  - Status badge
  - Message count
  - Linked notice indicator

### Thread Detail (`/communications/[id]`)

- **Header**: Subject, workspace, status selector
- **Messages**: Chat-style bubbles
  - System messages (centered, gray)
  - Own messages (right, blue)
  - Others' messages (left, gray)
  - Internal notes (yellow, dashed border)
- **Message Input**:
  - Internal note toggle (CA only)
  - Send button
- **Sidebar**:
  - Thread info
  - Linked notice
  - Evidence requests with status/actions
  - AI summary

## Seed Data

### Sample Threads

1. **GST Notice Thread**
   - Type: NOTICE
   - Status: WAITING_CLIENT
   - Linked to GST Scrutiny Notice
   - Messages: CA explanation, document request, client acknowledgment

2. **Client Follow-up**
   - Type: GENERAL
   - Status: WAITING_INTERNAL
   - Messages: Client query, CA internal note, response

3. **Internal Discussion**
   - Type: TASK
   - Status: RESOLVED
   - Messages: CA internal notes only

4. **Pending Document**
   - Type: DOCUMENT_REQUEST
   - Status: OPEN
   - Evidence request: Bank statements

## Future Enhancements

### Out of Scope (v1.0)

- ❌ Real email integration
- ❌ WhatsApp sync
- ❌ WebSocket real-time chat
- ❌ Push notifications
- ❌ File upload infrastructure

### Planned

- [ ] Email thread sync
- [ ] Client portal view
- [ ] Push notifications
- [ ] Template messages
- [ ] Scheduled reminders

## Best Practices

### For CA Firms

1. Use internal notes for strategy and review comments
2. Link threads to notices for traceability
3. Request evidence early to avoid delays
4. Update status to WAITING_CLIENT when awaiting response
5. Use AI summaries for quick context on long threads

### For Clients

1. Upload requested documents promptly
2. Respond to queries within due dates
3. Check thread for updates and requests

---

*Last Updated: 2026-05-22*
*Version: 1.0.0*