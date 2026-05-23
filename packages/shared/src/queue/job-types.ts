/**
 * Job Types and Data Definitions
 */

export interface BaseJobData {
  tenantId: string;
  userId?: string;
  correlationId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface AIActionJobData extends BaseJobData {
  actionType: 'summarize_notice' | 'suggest_tasks' | 'insights' | 'chat' | 'compliance_advice';
  entityType: 'notice' | 'task' | 'business' | 'document' | 'workspace' | 'vendor' | 'return';
  entityId: string;
  prompt?: string;
  context?: Record<string, any>;
}

export interface NotificationJobData extends BaseJobData {
  type: 'email' | 'push' | 'in_app' | 'sms';
  recipientUserId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channel?: string;
}

export interface AuditJobData extends BaseJobData {
  auditType: 'write' | 'read' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RetentionJobData extends BaseJobData {
  retentionType: 'cleanup_documents' | 'archive_audit' | 'purge_sessions' | 'vacuum_db';
  olderThanDays: number;
  dryRun?: boolean;
}

export interface EmailJobData extends BaseJobData {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: { filename: string; path: string }[];
}

export interface DocumentJobData extends BaseJobData {
  documentId: string;
  operationType: 'virus_scan' | 'thumbnail' | 'metadata_extract' | 'compress';
}

export type JobData = AIActionJobData | NotificationJobData | AuditJobData | RetentionJobData | EmailJobData | DocumentJobData;
