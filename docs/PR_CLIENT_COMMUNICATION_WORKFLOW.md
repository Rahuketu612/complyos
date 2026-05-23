# PR: Client Communication & Evidence Workflow

## Summary

Add Client Communication workflow to COMPLYOS - enabling CA firms to manage client interactions, track document requests, and maintain evidence of compliance work.

### Changes

- **Entities**: CommunicationThread, CommunicationMessage, EvidenceRequest
- **Backend**: CommunicationService, CommunicationController (20+ endpoints)
- **Frontend**: `/communications` list page, `/communications/[id]` detail page
- **Security**: Internal notes hidden from CLIENT role, tenant isolation enforced
- **AI Integration**: Thread summarization endpoint with AIActionLog correlation
- **Seed Data**: 2 sample threads + 2 evidence requests

## Screenshots Checklist

- [ ] Communications list page with stats cards
- [ ] Thread detail page with chat UI
- [ ] Internal note toggle (visible only to CA/ADMIN)
- [ ] Evidence request cards with status badges
- [ ] Status change dropdown
- [ ] Filter controls (status, type, search)
- [ ] Sidebar navigation with Communications link

## Test Checklist

### Unit Tests (`communication.spec.ts`)
- [ ] Thread creation with initial system message
- [ ] Internal notes hidden when `includeInternal: false`
- [ ] Internal notes shown when `includeInternal: true`
- [ ] CA can create internal note
- [ ] Cross-tenant thread access blocked
- [ ] Cross-tenant thread listing blocked
- [ ] Cross-tenant message posting blocked
- [ ] Evidence lifecycle: REQUESTED → UPLOADED
- [ ] Evidence lifecycle: UPLOADED → VERIFIED
- [ ] Evidence lifecycle: UPLOADED → REJECTED
- [ ] Evidence requests list filtered by status
- [ ] Thread status updates
- [ ] Thread assignment
- [ ] Thread stats aggregation
- [ ] AI summary returns thread data

### Manual Testing
- [ ] Create thread from notice
- [ ] Add message (public)
- [ ] Add internal note (verify CA role)
- [ ] Update status
- [ ] Create evidence request
- [ ] Verify cross-workspace access denied

## Migration Notes

### New Tables
```sql
-- Required Prisma migrations:
-- communication_threads
-- communication_messages  
-- evidence_requests
```

### Schema Additions
- 3 new enums: CommunicationType, ThreadStatus, MessageType, EvidenceStatus
- Relations added to existing models (Tenant, User, Workspace, Business, Notice, Task, DocumentVault)

### Rollback
1. Drop tables: `evidence_requests`, `communication_messages`, `communication_threads`
2. Remove relations from existing models
3. Delete controller/service files
4. Remove frontend pages

## Security Considerations

### Role-Based Access
| Role | View Internal | Create Internal | Manage Evidence |
|------|--------------|-----------------|-----------------|
| CLIENT | ❌ | ❌ | ❌ |
| CA | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ |

### Tenant Isolation
- All queries include `tenantId` filter
- Thread/message CRUD validates tenant before operation
- NotFoundException thrown for cross-tenant access (no information leakage)

### Internal Notes
- `isInternalNote` boolean field
- Filtered in service layer based on `includeInternal` parameter
- Controller enforces role check before enabling internal note UI

### Evidence Requests
- Only CA/ADMIN can create/update status
- CLIENT role cannot access these endpoints (enforced by auth guard)
- Status transitions logged

## Technical Details

### Files Changed
```
packages/database/schema.prisma      (+927 lines)
packages/database/seed.ts           (+548 lines)
apps/ca-service/src/app.module.ts   (+27 lines)
apps/ca-service/src/services/       (+502 lines)
apps/ca-service/src/controllers/    (+267 lines)
apps/ca-service/src/__tests__/     (+500 lines)
apps/web/src/components/sidebar.tsx (+2 lines)
apps/web/src/store/auth-store.ts    (+26 lines)
apps/web/src/app/(main)/communications/ (+794 lines)
docs/CLIENT_COMMUNICATION_WORKFLOW.md (new)
```

### Environment Variables
None required for basic functionality.

### Dependencies
No new npm packages - uses existing Prisma, NestJS, Next.js stack.

## Performance
- Indexes on: `tenantId+workspaceId`, `tenantId+status`, `threadId+createdAt`, `status`
- Pagination: default 50 threads, 100 messages
- No N+1 queries (includes relations)

## Future Enhancements (Out of Scope)
- Email integration
- WhatsApp/business chat sync
- WebSocket real-time chat
- Push notifications
- File upload infrastructure
- Client portal view

---

**Reviewer:** @Rahuketu612
**Branch:** feat/client-communication-workflow
**Base:** main