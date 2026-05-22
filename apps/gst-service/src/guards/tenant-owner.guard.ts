import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guard to enforce tenant isolation.
 * Validates that the current user's tenant matches the requested resource.
 * 
 * Usage: Add @UseGuards(TenantOwnerGuard) and @Body('tenantId') or @Param('tenantId')
 */
@Injectable()
export class TenantOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceTenantId = this.getResourceTenantId(request);

    // If resource has a tenantId, validate it matches the user's tenant
    if (resourceTenantId && user?.tenantId) {
      if (resourceTenantId !== user.tenantId) {
        throw new ForbiddenException('Access denied: resource belongs to another tenant');
      }
    }

    return true;
  }

  private getResourceTenantId(request: any): string | null {
    // Check body
    if (request.body?.tenantId) return request.body.tenantId;
    
    // Check params
    if (request.params?.tenantId) return request.params.tenantId;
    
    // Check query (for list operations)
    if (request.query?.tenantId) return request.query.tenantId;
    
    return null;
  }
}