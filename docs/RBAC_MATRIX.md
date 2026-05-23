# RBAC Matrix Documentation

## Overview

COMPLYOS implements Role-Based Access Control (RBAC) with two levels:
- **Global Roles**: Tenant-wide permissions
- **Workspace Roles**: Resource-level permissions within workspaces

## Global Roles

| Role | Value | Hierarchy | Description |
|------|-------|-----------|-------------|
| SUPER_ADMIN | `super_admin` | 100 | Full system access |
| ORG_ADMIN | `organization_admin` | 80 | Organization management |
| BUSINESS_OWNER | `business_owner` | 60 | Business operations |
| CA_ADMIN | `ca_admin` | 70 | CA service administration |
| CA_STAFF | `ca_staff` | 40 | CA staff operations |
| AUDITOR | `auditor` | 30 | Audit capabilities |
| READ_ONLY_AUDITOR | `read_only_auditor` | 25 | Read-only audit |
| COMPLIANCE_MANAGER | `compliance_manager` | 50 | Compliance oversight |
| VIEWER | `viewer` | 10 | Read-only access |

## Workspace Roles

| Role | Value | Description |
|------|-------|-------------|
| OWNER | `owner` | Full workspace control |
| ADMIN | `admin` | Workspace administration |
| MEMBER | `member` | Standard workspace member |
| VIEWER | `workspace_viewer` | Read-only workspace access |
| CLIENT | `client` | External client access |

## Permission Matrix

### Notices

| Action | CA_ADMIN | CA_STAFF | COMPLIANCE_MANAGER | VIEWER |
|--------|----------|----------|-------------------|--------|
| CREATE | ✓ | ✓ | ✓ | ✗ |
| READ | ✓ | ✓ | ✓ | ✓ |
| UPDATE | ✓ | ✓ | ✓ | ✗ |
| DELETE | ✓ | ✓ | ✗ | ✗ |
| ASSIGN | ✓ | ✓ | ✓ | ✗ |

### Communications

| Action | CA_ADMIN | CA_STAFF | COMPLIANCE_MANAGER | VIEWER |
|--------|----------|----------|-------------------|--------|
| CREATE | ✓ | ✓ | ✓ | ✗ |
| READ | ✓ | ✓ | ✓ | ✓ |
| UPDATE | ✓ | ✓ | ✓ | ✗ |
| DELETE | ✓ | ✓ | ✗ | ✗ |

### Tasks

| Action | CA_ADMIN | CA_STAFF | COMPLIANCE_MANAGER | VIEWER |
|--------|----------|----------|-------------------|--------|
| CREATE | ✓ | ✓ | ✓ | ✗ |
| READ | ✓ | ✓ | ✓ | ✓ |
| UPDATE | ✓ | ✓ | ✓ | ✗ |
| DELETE | ✓ | ✓ | ✗ | ✗ |
| ASSIGN | ✓ | ✓ | ✓ | ✗ |

### Documents

| Action | CA_ADMIN | CA_STAFF | COMPLIANCE_MANAGER | VIEWER |
|--------|----------|----------|-------------------|--------|
| UPLOAD | ✓ | ✓ | ✓ | ✗ |
| READ | ✓ | ✓ | ✓ | ✓ |
| DELETE | ✓ | ✓ | ✗ | ✗ |

### Vendors

| Action | CA_ADMIN | CA_STAFF | BUSINESS_OWNER | VIEWER |
|--------|----------|----------|----------------|--------|
| CREATE | ✓ | ✓ | ✓ | ✗ |
| READ | ✓ | ✓ | ✓ | ✓ |
| UPDATE | ✓ | ✓ | ✗ | ✗ |
| DELETE | ✓ | ✗ | ✗ | ✗ |

## Implementation

### Guards

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RbacGuard } from './auth/guards';
import { GlobalRole } from '@complyos/shared';

@Controller('notices')
@UseGuards(JwtAuthGuard, RbacGuard)
export class NoticeController {
  @Get()
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.VIEWER)
  async listNotices() {}
}
```

### Role Context

The `RbacGuard` attaches a `roleContext` to the request:

```typescript
interface RoleContext {
  globalRole: GlobalRole;
  workspaceRole?: WorkspaceRole;
  workspaceId?: string;
  userId: string;
  tenantId: string;
}
```

## Security Considerations

1. **Tenant Isolation**: All queries must filter by `tenantId`
2. **Role Hierarchy**: Use `isRoleAtLeast()` for level-based checks
3. **Audit Trail**: All permission denials are logged
4. **Workspace Boundaries**: Cross-workspace access requires elevated roles
