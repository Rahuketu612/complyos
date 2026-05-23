/**
 * RBAC Authorization Service
 * Centralized permission checking for COMPLYOS.
 */

import {
  GlobalRole,
  WorkspaceRole,
  Resource,
  Action,
  RoleContext,
  PermissionCheck,
} from './types';

export function checkPermission(
  context: RoleContext,
  resource: Resource,
  action: Action,
  resourceData?: Record<string, any>,
): PermissionCheck {
  // Super admin always has access
  if (context.globalRole === GlobalRole.SUPER_ADMIN) {
    return { allowed: true, reason: 'Super admin bypass' };
  }

  // Check global permissions
  if (!context.globalRole) {
    return {
      allowed: false,
      reason: 'No global role assigned',
      requiredRole: 'Any authenticated role',
    };
  }

  // Get role string value
  const roleStr = context.globalRole as string;

  // Super admin has all permissions
  if (roleStr === 'super_admin') {
    return { allowed: true, reason: 'Super admin bypass' };
  }

  // Check permissions based on role
  const rolePermissions = getRolePermissions(roleStr);
  const resourceStr = resource;

  if (!rolePermissions[resourceStr]?.includes(action)) {
    // Check resource ownership as fallback
    if (resourceData && context.userId) {
      const ownershipRules = getOwnershipRules(resourceStr);
      for (const rule of ownershipRules) {
        const ownerValue = resourceData[rule.ownerField];
        if (ownerValue === context.userId) {
          if (action === Action.READ || action === Action.UPDATE) {
            return {
              allowed: true,
              reason: `User is resource owner (${rule.ownerField})`,
            };
          }
        }
      }
    }

    return {
      allowed: false,
      reason: `Role ${roleStr} does not have ${action} permission on ${resourceStr}`,
    };
  }

  // Check workspace restrictions
  if (context.workspaceRole) {
    const workspaceOverride = getWorkspacePermissions(context.workspaceRole);
    if (workspaceOverride[resourceStr]) {
      const allowed = workspaceOverride[resourceStr].includes(action);
      return {
        allowed,
        reason: allowed ? 'Workspace role allows action' : 'Workspace role restricts action',
      };
    }
  }

  return { allowed: true, reason: 'Permission granted by role' };
}

export function canAccessResource(
  context: RoleContext,
  resource: Resource,
  action: Action,
  resourceData: Record<string, any>,
): PermissionCheck {
  const permissionCheck = checkPermission(context, resource, action, resourceData);

  if (!permissionCheck.allowed) {
    return permissionCheck;
  }

  // Check tenant isolation
  if (resourceData.tenantId && resourceData.tenantId !== context.tenantId) {
    return { allowed: false, reason: 'Tenant isolation violation' };
  }

  // Check workspace access
  if (context.workspaceId && resourceData.workspaceId) {
    if (resourceData.workspaceId !== context.workspaceId) {
      if (context.globalRole !== 'super_admin') {
        return { allowed: false, reason: 'Workspace access required' };
      }
    }
  }

  return { allowed: true, reason: 'Resource access granted' };
}

export function getAllowedActions(
  context: RoleContext,
  resource: Resource,
): Action[] {
  if (context.globalRole === GlobalRole.SUPER_ADMIN) {
    return Object.values(Action);
  }

  const roleStr = context.globalRole || '';
  const resourceStr = resource;
  const permissions = getRolePermissions(roleStr)[resourceStr] || [];

  if (context.workspaceRole) {
    const workspaceOverride = getWorkspacePermissions(context.workspaceRole);
    const workspacePerms = workspaceOverride[resourceStr];
    if (workspacePerms) {
      return permissions.filter((a: Action) => workspacePerms.includes(a));
    }
  }

  return permissions;
}

export function createPermissionChecker(context: RoleContext) {
  return {
    can: (resource: Resource, action: Action, resourceData?: Record<string, any>) =>
      checkPermission(context, resource, action, resourceData),
    canAccess: (resource: Resource, action: Action, resourceData: Record<string, any>) =>
      canAccessResource(context, resource, action, resourceData),
    getAllowedActions: (resource: Resource) =>
      getAllowedActions(context, resource),
    isRole: (role: GlobalRole) => context.globalRole === role,
    isWorkspaceRole: (role: WorkspaceRole) => context.workspaceRole === role,
    context,
  };
}

// Permission lookup tables
function getRolePermissions(role: string): Record<string, Action[]> {
  const allActions = [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.ASSIGN, Action.APPROVE];

  const permissions: Record<string, Record<string, Action[]>> = {
    super_admin: {
      notice: allActions, communication: allActions, task: allActions,
      document: allActions, vendor: allActions, workspace: allActions,
      user: allActions, business: allActions, audit_log: allActions, settings: allActions,
    },
    organization_admin: {
      notice: allActions, communication: allActions, task: allActions,
      document: allActions, vendor: allActions, workspace: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN],
      user: [Action.READ, Action.CREATE, Action.UPDATE], business: allActions,
      audit_log: [Action.READ], settings: [Action.READ, Action.UPDATE],
    },
    ca_admin: {
      notice: allActions, communication: allActions, task: allActions,
      document: allActions, vendor: allActions, workspace: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN],
      user: [Action.READ, Action.CREATE], business: allActions,
      audit_log: [Action.READ], settings: [Action.READ, Action.UPDATE],
    },
    ca_staff: {
      notice: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN],
      communication: [Action.READ, Action.CREATE, Action.UPDATE],
      task: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN],
      document: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
      vendor: [Action.READ, Action.CREATE, Action.UPDATE],
      workspace: [Action.READ], user: [Action.READ], business: [Action.READ, Action.CREATE],
      audit_log: [], settings: [Action.READ],
    },
    business_owner: {
      notice: [Action.READ, Action.UPDATE],
      communication: [Action.READ, Action.CREATE, Action.UPDATE],
      task: [Action.READ], document: [Action.READ, Action.CREATE],
      vendor: [Action.READ], workspace: [Action.READ], user: [Action.READ],
      business: [Action.READ, Action.UPDATE], audit_log: [], settings: [Action.READ],
    },
    compliance_manager: {
      notice: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN, Action.APPROVE],
      communication: [Action.READ, Action.CREATE, Action.UPDATE],
      task: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN, Action.APPROVE],
      document: [Action.READ, Action.CREATE, Action.UPDATE],
      vendor: [Action.READ], workspace: [Action.READ], user: [Action.READ],
      business: [Action.READ, Action.UPDATE], audit_log: [Action.READ], settings: [Action.READ],
    },
    auditor: {
      notice: [Action.READ], communication: [Action.READ], task: [Action.READ],
      document: [Action.READ], vendor: [Action.READ], workspace: [Action.READ],
      user: [Action.READ], business: [Action.READ], audit_log: [Action.READ], settings: [],
    },
    read_only_auditor: {
      notice: [Action.READ], communication: [Action.READ], task: [Action.READ],
      document: [Action.READ], vendor: [Action.READ], workspace: [Action.READ],
      user: [Action.READ], business: [Action.READ], audit_log: [Action.READ], settings: [],
    },
    viewer: {
      notice: [Action.READ], communication: [Action.READ], task: [Action.READ],
      document: [Action.READ], vendor: [Action.READ], workspace: [Action.READ],
      user: [Action.READ], business: [Action.READ], audit_log: [], settings: [],
    },
  };

  return permissions[role] || { notice: [], communication: [], task: [], document: [], vendor: [], workspace: [], user: [], business: [], audit_log: [], settings: [] };
}

function getWorkspacePermissions(role: WorkspaceRole): Record<string, Action[]> {
  const allActions = [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.ASSIGN, Action.APPROVE];

  const workspacePerms: Record<string, Record<string, Action[]>> = {
    owner: {
      notice: allActions, communication: allActions, task: allActions,
      document: allActions, vendor: allActions, workspace: allActions,
    },
    admin: {
      notice: allActions, communication: allActions, task: allActions,
      document: allActions, vendor: allActions, workspace: [Action.READ, Action.UPDATE, Action.ASSIGN],
    },
    member: {
      notice: [Action.READ, Action.CREATE, Action.UPDATE],
      communication: [Action.READ, Action.CREATE],
      task: [Action.READ, Action.UPDATE],
      document: [Action.READ, Action.CREATE],
      vendor: [Action.READ], workspace: [Action.READ],
    },
    workspace_viewer: {
      notice: [Action.READ], communication: [Action.READ], task: [Action.READ],
      document: [Action.READ], vendor: [Action.READ], workspace: [Action.READ],
    },
    client: {
      notice: [Action.READ, Action.UPDATE],
      communication: [Action.READ, Action.CREATE, Action.UPDATE],
      task: [Action.READ], document: [Action.READ, Action.CREATE],
      vendor: [], workspace: [Action.READ],
    },
  };

  return workspacePerms[role] || { notice: [], communication: [], task: [], document: [], vendor: [], workspace: [] };
}

function getOwnershipRules(resource: string): { ownerField: string; ownerRole: string }[] {
  const rules: Record<string, { ownerField: string; ownerRole: string }[]> = {
    notice: [
      { ownerField: 'assignedTo', ownerRole: 'admin' },
      { ownerField: 'createdBy', ownerRole: 'member' },
    ],
    communication: [{ ownerField: 'createdBy', ownerRole: 'member' }],
    task: [
      { ownerField: 'assignedTo', ownerRole: 'admin' },
      { ownerField: 'createdBy', ownerRole: 'member' },
    ],
    document: [{ ownerField: 'uploadedBy', ownerRole: 'member' }],
    vendor: [{ ownerField: 'createdBy', ownerRole: 'admin' }],
    workspace: [{ ownerField: 'ownerId', ownerRole: 'owner' }],
    business: [{ ownerField: 'primaryUserId', ownerRole: 'owner' }],
  };

  return rules[resource] || [];
}

export const ROLE_HIERARCHY: Record<GlobalRole, number> = {
  [GlobalRole.SUPER_ADMIN]: 100,
  [GlobalRole.ORG_ADMIN]: 80,
  [GlobalRole.CA_ADMIN]: 70,
  [GlobalRole.BUSINESS_OWNER]: 60,
  [GlobalRole.COMPLIANCE_MANAGER]: 50,
  [GlobalRole.CA_STAFF]: 40,
  [GlobalRole.AUDITOR]: 30,
  [GlobalRole.READ_ONLY_AUDITOR]: 25,
  [GlobalRole.VIEWER]: 10,
};

export function isRoleAtLeast(userRole: GlobalRole | null, requiredRole: GlobalRole): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Administrator',
  organization_admin: 'Organization Admin',
  business_owner: 'Business Owner',
  ca_admin: 'CA Admin',
  ca_staff: 'CA Staff',
  auditor: 'Auditor',
  read_only_auditor: 'Read-only Auditor',
  compliance_manager: 'Compliance Manager',
  viewer: 'Viewer',
  owner: 'Workspace Owner',
  admin: 'Workspace Admin',
  member: 'Workspace Member',
  workspace_viewer: 'Workspace Viewer',
  client: 'Client',
};
