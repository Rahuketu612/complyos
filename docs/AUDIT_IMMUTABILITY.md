# Audit Immutability Documentation

## Overview

COMPLYOS implements immutable audit logging with hash chain verification for tamper detection and compliance requirements.

## Architecture

### Hash Chain

Every audit entry contains:
- `previousHash`: Hash of the previous entry (null for first entry)
- `currentHash`: SHA-256 hash of current entry data

This creates an unbroken chain where any tampering breaks the chain.

### Audit Entry Structure

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousHash: string | null;
  currentHash: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  workspaceId?: string;
  businessId?: string;
}
```

## Audit Actions

### Notice Actions
- `notice.created`
- `notice.updated`
- `notice.assigned`
- `notice.closed`

### Task Actions
- `task.created`
- `task.updated`
- `task.completed`
- `task.assigned`

### Document Actions
- `document.uploaded`
- `document.downloaded`
- `document.deleted`

### Communication Actions
- `thread.created`
- `message.sent`

### Auth Actions
- `auth.login`
- `auth.logout`
- `auth.user_created`

### Workspace Actions
- `workspace.created`
- `workspace.updated`
- `workspace.member_added`
- `workspace.member_removed`

### System Actions
- `system.settings_changed`
- `system.permission_changed`

## Verification

### Chain Integrity Check

```typescript
import { verifyAuditChain, generateIntegrityReport } from '@complyos/shared';

const entries = await prisma.auditLog.findMany({
  where: { tenantId },
  orderBy: { timestamp: 'asc' }
});

const result = verifyAuditChain(entries);
const report = generateIntegrityReport(entries, result);

if (!report.chainIntact) {
  // Alert security team - potential tampering
}
```

### Entry Verification

```typescript
import { verifyAuditEntry } from '@complyos/shared';

const entry = await prisma.auditLog.findUnique({ where: { id } });
const { valid, error } = verifyAuditEntry(entry);

if (!valid) {
  // Entry has been tampered
}
```

## Export for Compliance

```typescript
import { exportAuditEntries } from '@complyos/shared';

const entries = await prisma.auditLog.findMany({
  where: { tenantId },
  orderBy: { timestamp: 'asc' }
});

// JSON lines format with integrity report
const exportData = exportAuditEntries(entries, true);

// Send to WORM storage (S3, Azure Blob, etc.)
await sendToWORMStorage(exportData);
```

## Worker Processing

Audit jobs are processed by `AuditProcessorWorker`:

1. **write**: Records new audit entries
2. **read**: Logs access to sensitive resources  
3. **verify**: Runs chain integrity verification (scheduled job)

## Retention Policy

| Data Type | Retention | Action |
|-----------|-----------|--------|
| Audit entries | 7 years | Archive to cold storage |
| Verification reports | 7 years | Keep with archive |
| Raw logs | 90 days | Hot storage |

## Security Considerations

1. **Append-only**: No UPDATE or DELETE operations allowed on audit table
2. **Hash verification**: Run scheduled verification jobs
3. **WORM storage**: Export to immutable storage monthly
4. **Access control**: Only SUPER_ADMIN can query raw audit logs
