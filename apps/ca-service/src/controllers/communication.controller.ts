import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, RequireRoles } from '../auth/guards/rbac';
import { GlobalRole } from '@complyos/shared';
import { CommunicationService } from '../services/communication.service';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CommunicationController {
  constructor(private communicationService: CommunicationService) {}

  @Get('threads')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'List communication threads' })
  async listThreads(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.communicationService.getThreads({ 
      tenantId: req.user.tenantId, 
      workspaceId 
    });
  }

  @Get('threads/:threadId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'Get thread messages' })
  async getThread(@Request() req: any, @Param('threadId') threadId: string) {
    return this.communicationService.getThread({ tenantId: req.user.tenantId, threadId });
  }

  @Post('threads')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Create new thread' })
  async createThread(
    @Request() req: any,
    @Body() body: { workspaceId: string; subject: string; type?: string; entityType?: string; entityId?: string },
  ) {
    return this.communicationService.createThread({
      tenantId: req.user.tenantId,
      workspaceId: body.workspaceId,
      subject: body.subject,
      type: body.type || 'general',
      createdBy: req.user.id,
      businessId: body.entityType === 'business' ? body.entityId : undefined,
      noticeId: body.entityType === 'notice' ? body.entityId : undefined,
      taskId: body.entityType === 'task' ? body.entityId : undefined,
      documentId: body.entityType === 'document' ? body.entityId : undefined,
    });
  }
}
