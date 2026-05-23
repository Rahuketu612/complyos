/**
 * Audit Types
 * Immutable audit log definitions
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousHash: string | null;  // Hash of previous entry (for chain)
  currentHash: string;         // Hash of this entry
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  // Denormalized for quick queries
  workspaceId?: string;
  businessId?: string;
}

export enum AuditAction {
  // Notice actions
  NOTICE_CREATED = 'notice.created',
  NOTICE_UPDATED = 'notice.updated',
  NOTICE_ASSIGNED = 'notice.assigned',
  NOTICE_CLOSED = 'notice.closed',
  
  // Task actions
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_COMPLETED = 'task.completed',
  TASK_ASSIGNED = 'task.assigned',
  
  // Document actions
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_DOWNLOADED = 'document.downloaded',
  DOCUMENT_DELETED = 'document.deleted',
  
  // Communication actions
  THREAD_CREATED = 'thread.created',
  MESSAGE_SENT = 'message.sent',
  
  // Auth actions
  USER_LOGIN = 'auth.login',
  USER_LOGOUT = 'auth.logout',
  USER_CREATED = 'auth.user_created',
  
  // Workspace actions
  WORKSPACE_CREATED = 'workspace.created',
  WORKSPACE_UPDATED = 'workspace.updated',
  MEMBER_ADDED = 'workspace.member_added',
  MEMBER_REMOVED = 'workspace.member_removed',
  
  // Business actions
  BUSINESS_CREATED = 'business.created',
  BUSINESS_UPDATED = 'business.updated',
  
  // Vendor actions
  VENDOR_CREATED = 'vendor.created',
  VENDOR_UPDATED = 'vendor.updated',
  
  // System actions
  SETTINGS_CHANGED = 'system.settings_changed',
  PERMISSION_CHANGED = 'system.permission_changed',
}

export interface AuditVerificationResult {
  valid: boolean;
  brokenChain: boolean;
  lastVerifiedEntryId: string | null;
  errors: string[];
  verifiedCount: number;
}

export interface AuditIntegrityReport {
  generatedAt: string;
  totalEntries: number;
  chainIntact: boolean;
  lastEntryHash: string;
  verificationResult: AuditVerificationResult;
}
