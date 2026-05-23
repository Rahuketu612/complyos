import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata, Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole, WorkspaceRole } from '@complyos/shared';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const requiredRoles = this.reflector.get<GlobalRole[]>(ROLES_KEY, context.getHandler());
    if (requiredRoles?.length) {
      const userRole = user.globalRole as GlobalRole;
      if (!requiredRoles.includes(userRole)) {
        this.logger.warn(`User ${user.id} denied: requires [${requiredRoles.join(', ')}], has ${userRole}`);
        throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
      }
    }

    request.roleContext = {
      globalRole: user.globalRole as GlobalRole,
      workspaceRole: user.workspaceRole as WorkspaceRole | null,
      workspaceId: user.workspaceId || request.params.workspaceId,
      userId: user.id,
      tenantId: user.tenantId,
    };

    return true;
  }
}
