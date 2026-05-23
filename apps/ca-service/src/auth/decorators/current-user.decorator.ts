import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get current user from request
 * Usage: @CurrentUser() or @CurrentUser('id') or @CurrentUser('tenantId')
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);