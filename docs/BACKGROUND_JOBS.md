# Background Jobs Documentation

## Overview

COMPLYOS uses BullMQ with Redis for asynchronous job processing. This enables:
- Non-blocking API responses
- Scheduled/cron jobs
- Reliable retry with exponential backoff
- Job monitoring and queues

## Queue Architecture

### Queue Definitions

```typescript
export const QUEUES = {
  AI_TASKS: 'ai-tasks',           // AI processing
  NOTIFICATIONS: 'notifications', // Email, push, SMS
  AUDIT_PROCESSING: 'audit-processing', // Audit logging
  RETENTION_CLEANUP: 'retention-cleanup', // Data retention
  EMAIL: 'email',                 // Transactional emails
  DOCUMENT_PROCESSING: 'document-processing', // Document ops
  GENERAL: 'general',             // General purpose
};
```

## Job Types

### AI Job Data

```typescript
interface AIActionJobData {
  actionType: 'summarize_notice' | 'suggest_tasks' | 'insights' | 'chat' | 'compliance_advice';
  entityType: 'notice' | 'task' | 'business' | 'document' | 'workspace' | 'vendor' | 'return';
  entityId: string;
  tenantId: string;
  userId?: string;
}
```

### Notification Job Data

```typescript
interface NotificationJobData {
  type: 'email' | 'push' | 'in_app' | 'sms';
  recipientUserId: string;
  title: string;
  message: string;
  tenantId: string;
  data?: Record<string, any>;
}
```

### Retention Job Data

```typescript
interface RetentionJobData {
  retentionType: 'cleanup_documents' | 'archive_audit' | 'purge_sessions' | 'vacuum_db';
  olderThanDays: number;
  dryRun?: boolean;
  tenantId: string;
}
```

## Job Options

Default job options applied to all jobs:

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000, age: 86400 }, // 24 hours
  removeOnFail: { count: 5000, age: 604800 }, // 7 days
}
```

## Adding Jobs

### From Controllers/Services

```typescript
import { addNotificationJob, addAIJob, addAuditJob } from '@complyos/shared';

// Send notification
await addNotificationJob({
  tenantId,
  userId,
  type: 'email',
  title: 'New Notice Assigned',
  message: 'You have been assigned a new compliance notice.',
});

// AI processing
await addAIJob({
  tenantId,
  userId,
  actionType: 'summarize_notice',
  entityType: 'notice',
  entityId: notice.id,
});

// Audit logging
await addAuditJob({
  tenantId,
  userId,
  auditType: 'write',
  entityType: 'notice',
  entityId: notice.id,
});
```

### From Retention Workers

```typescript
import { addRetentionJob } from '@complyos/shared';

// Dry run cleanup
await addRetentionJob({
  tenantId,
  retentionType: 'cleanup_documents',
  olderThanDays: 90,
  dryRun: true, // Test first
});

// Actual cleanup
await addRetentionJob({
  tenantId,
  retentionType: 'cleanup_documents',
  olderThanDays: 90,
  dryRun: false,
});
```

## Workers

### Worker Files

| Worker | Queue | Description |
|--------|-------|-------------|
| `AuditProcessorWorker` | `audit-processing` | Audit logging and verification |
| `NotificationProcessorWorker` | `notifications` | Email, push, SMS sending |
| `RetentionProcessorWorker` | `retention-cleanup` | Data retention and cleanup |

### Running Workers

```bash
# Development
npm run start:dev --workspace=@complyos/ca-service

# Production (with pm2/Docker)
node dist/main.js --worker
```

## Scheduled Jobs

### Cron Expressions

| Job | Schedule | Purpose |
|-----|----------|---------|
| Audit Verification | `0 2 * * *` (2 AM daily) | Verify chain integrity |
| Document Cleanup | `0 3 * * 0` (3 AM weekly) | Delete old documents |
| Session Purge | `0 */4 * * *` (every 4 hours) | Clean expired sessions |
| DB Vacuum | `0 4 * * 0` (4 AM weekly) | PostgreSQL maintenance |

## Health Monitoring

```typescript
import { checkQueueHealth } from '@complyos/shared';

const health = await checkQueueHealth(QUEUES.AUDIT_PROCESSING);

console.log(`
  Queue: audit-processing
  Healthy: ${health.healthy}
  Waiting: ${health.waiting}
  Active: ${health.active}
  Completed: ${health.completed}
  Failed: ${health.failed}
`);
```

## Graceful Shutdown

```typescript
import { closeAllQueues } from '@complyos/shared';

// In NestJS onModuleDestroy
async onModuleDestroy() {
  await closeAllQueues();
}
```

## Redis Configuration

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
```

## Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```
