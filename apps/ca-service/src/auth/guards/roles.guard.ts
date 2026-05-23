import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@complyos/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // For workspace-level operations, check workspace role
    const workspaceId = request.params.workspaceId || request.body?.workspaceId;
    if (workspaceId && user.workspaceRoles?.[workspaceId]) {
      const userRole = user.workspaceRoles[workspaceId];
      const hasRole = requiredRoles.includes(userRole as WorkspaceRole);
      if (!hasRole) {
        throw new ForbiddenException('Insufficient workspace permissions');
      }
      return true;
    }

    // Fall back to global role check
    const userRole = user.role;
    const hasRole = requiredRoles.includes(userRole as WorkspaceRole);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}