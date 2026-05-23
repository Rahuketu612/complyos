import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, RequireRoles } from '../auth/guards/rbac';
import { GlobalRole } from '@complyos/shared';
import { WorkspaceService } from '../services/workspace.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(JwtAuthGuard, RbacGuard)
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get()
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'List workspaces' })
  async listWorkspaces(@Request() req: any) {
    return this.workspaceService.listWorkspaces(req.user.tenantId, req.user.id);
  }

  @Get(':workspaceId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'Get workspace details' })
  async getWorkspace(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspace(req.user.tenantId, workspaceId, req.user.id);
  }

  @Post()
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Create workspace' })
  async createWorkspace(@Request() req: any, @Body() body: { name: string; businessId?: string; firmId?: string }) {
    return this.workspaceService.createWorkspace(
      req.user.tenantId,
      req.user.id,
      body.firmId || req.user.firmId,
      body
    );
  }
}
