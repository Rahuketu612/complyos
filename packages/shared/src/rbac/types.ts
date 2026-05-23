/**
 * RBAC Type Definitions
 * Centralized resource-level permission matrix for COMPLYOS.
 */

export enum GlobalRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'organization_admin',
  BUSINESS_OWNER = 'business_owner',
  CA_ADMIN = 'ca_admin',
  CA_STAFF = 'ca_staff',
  AUDITOR = 'auditor',
  READ_ONLY_AUDITOR = 'read_only_auditor',
  COMPLIANCE_MANAGER = 'compliance_manager',
  VIEWER = 'viewer',
}

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'workspace_viewer',
  CLIENT = 'client',
}

export enum Resource {
  NOTICE = 'notice',
  COMMUNICATION = 'communication',
  TASK = 'task',
  DOCUMENT = 'document',
  VENDOR = 'vendor',
  WORKSPACE = 'workspace',
  USER = 'user',
  BUSINESS = 'business',
  AUDIT_LOG = 'audit_log',
  SETTINGS = 'settings',
}

export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  APPROVE = 'approve',
}

export interface RoleContext {
  globalRole: GlobalRole | null;
  workspaceRole?: WorkspaceRole | null;
  workspaceId?: string | null;
  userId: string;
  tenantId: string;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
}
