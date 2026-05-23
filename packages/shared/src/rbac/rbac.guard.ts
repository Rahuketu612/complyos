/**
 * RBAC NestJS Guard
 * Use this guard to protect routes with RBAC.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole, WorkspaceRole, Resource, Action, RoleContext } from './types';
import { checkPermission } from './authorization.service';

export const ROLES_KEY = 'roles';
export const PERMISSION_KEY = 'permission';

export const RequireRoles = (...roles: GlobalRole[]) =>
  SetMetadata(ROLES_KEY, roles);

export interface PermissionOptions {
  resource: Resource;
  action: Action;
  workspaceParam?: string;
  resourceGetter?: (req: any) => Promise<Record<string, any>>;
}

export const RequirePermission = (options: PermissionOptions) =>
  SetMetadata(PERMISSION_KEY, options);

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const roleContext: RoleContext = {
      globalRole: user.globalRole as GlobalRole,
      workspaceRole: user.workspaceRole as WorkspaceRole | null,
      workspaceId: user.workspaceId || request.params.workspaceId,
      userId: user.id,
      tenantId: user.tenantId,
    };

    // Check role requirements
    const requiredRoles = this.reflector.get<GlobalRole[]>(ROLES_KEY, context.getHandler());
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.includes(roleContext.globalRole as GlobalRole);
      if (!hasRole) {
        throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
      }
    }

    // Check permission requirements
    const permOptions = this.reflector.get<PermissionOptions>(PERMISSION_KEY, context.getHandler());

    if (permOptions) {
      if (permOptions.workspaceParam) {
        roleContext.workspaceId = request.params[permOptions.workspaceParam];
      }

      let resourceData: Record<string, any> = {};
      if (permOptions.resourceGetter) {
        resourceData = await permOptions.resourceGetter(request);
      } else {
        resourceData = { ...request.params, ...request.body, workspaceId: roleContext.workspaceId, tenantId: roleContext.tenantId };
      }

      const check = checkPermission(roleContext, permOptions.resource, permOptions.action, resourceData);
      if (!check.allowed) {
        throw new ForbiddenException(check.reason || `Permission denied: ${permOptions.action} on ${permOptions.resource}`);
      }
    }

    request.roleContext = roleContext;
    return true;
  }
}

export function RequirePermissions(...permissions: PermissionOptions[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      SetMetadata(PERMISSION_KEY, permissions)(target, propertyKey, descriptor);
    } else {
      SetMetadata(PERMISSION_KEY, permissions)(target);
    }
  };
}
