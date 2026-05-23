import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunicationService } from '../services/communication.service';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private commService: CommunicationService) {}

  @Get()
  @ApiOperation({ summary: 'List communication threads' })
  async listThreads(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.commService.getThreads({
      tenantId: req.user.tenantId,
      workspaceId,
      status,
      type,
      assignedTo,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new communication thread' })
  async createThread(
    @Request() req: any,
    @Body() body: {
      subject: string;
      type: string;
      workspaceId: string;
      businessId?: string;
      noticeId?: string;
      taskId?: string;
      documentId?: string;
      priority?: string;
      assignedTo?: string;
      initialMessage?: string;
    },
  ) {
    const thread = await this.commService.createThread({
      tenantId: req.user.tenantId,
      workspaceId: body.workspaceId,
      subject: body.subject,
      type: body.type,
      createdBy: req.user.id,
      businessId: body.businessId,
      noticeId: body.noticeId,
      taskId: body.taskId,
      documentId: body.documentId,
      priority: body.priority,
      assignedTo: body.assignedTo,
    });

    if (body.initialMessage) {
      await this.commService.addMessage({
        tenantId: req.user.tenantId,
        threadId: thread.id,
        senderId: req.user.id,
        message: body.initialMessage,
      });
    }

    return thread;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get communication statistics' })
  async getStats(@Request() req: any, @Query('workspaceId') workspaceId?: string) {
    return this.commService.getThreadStats({
      tenantId: req.user.tenantId,
      workspaceId,
    });
  }

  @Get(':threadId')
  @ApiOperation({ summary: 'Get thread details with messages' })
  async getThread(@Request() req: any, @Param('threadId') threadId: string) {
    // Check if user wants to see internal notes (CA role only)
    const includeInternal = req.user.role === 'CA' || req.user.role === 'ADMIN';
    return this.commService.getThread({
      tenantId: req.user.tenantId,
      threadId,
      includeInternal,
    });
  }

  @Put(':threadId/status')
  @ApiOperation({ summary: 'Update thread status' })
  async updateStatus(
    @Request() req: any,
    @Param('threadId') threadId: string,
    @Body() body: { status: string },
  ) {
    return this.commService.updateThreadStatus({
      tenantId: req.user.tenantId,
      threadId,
      status: body.status,
      userId: req.user.id,
    });
  }

  @Put(':threadId/assign')
  @ApiOperation({ summary: 'Assign thread to user' })
  async assignThread(
    @Request() req: any,
    @Param('threadId') threadId: string,
    @Body() body: { assignedTo: string },
  ) {
    return this.commService.assignThread({
      tenantId: req.user.tenantId,
      threadId,
      assignedTo: body.assignedTo,
      userId: req.user.id,
    });
  }

  @Post(':threadId/messages')
  @ApiOperation({ summary: 'Add message to thread' })
  async addMessage(
    @Request() req: any,
    @Param('threadId') threadId: string,
    @Body() body: {
      message: string;
      messageType?: string;
      isInternalNote?: boolean;
      documentId?: string;
      correlationId?: string;
    },
  ) {
    return this.commService.addMessage({
      tenantId: req.user.tenantId,
      threadId,
      senderId: req.user.id,
      message: body.message,
      messageType: body.messageType || 'TEXT',
      isInternalNote: body.isInternalNote || false,
      documentId: body.documentId,
      correlationId: body.correlationId,
    });
  }

  @Get(':threadId/messages')
  @ApiOperation({ summary: 'Get thread messages' })
  async getMessages(
    @Request() req: any,
    @Param('threadId') threadId: string,
    @Query('includeInternal') includeInternal?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const canSeeInternal = req.user.role === 'CA' || req.user.role === 'ADMIN';
    return this.commService.getMessages({
      tenantId: req.user.tenantId,
      threadId,
      includeInternal: includeInternal === 'true' && canSeeInternal,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
  }

  // ===== Evidence Requests =====

  @Post('evidence')
  @ApiOperation({ summary: 'Create evidence request' })
  async createEvidenceRequest(
    @Request() req: any,
    @Body() body: {
      title: string;
      description?: string;
      dueDate?: string;
      threadId?: string;
      workspaceId: string;
      noticeId?: string;
      taskId?: string;
    },
  ) {
    return this.commService.createEvidenceRequest({
      tenantId: req.user.tenantId,
      workspaceId: body.workspaceId,
      requesterId: req.user.id,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      threadId: body.threadId,
      noticeId: body.noticeId,
      taskId: body.taskId,
    });
  }

  @Get('evidence')
  @ApiOperation({ summary: 'List evidence requests' })
  async getEvidenceRequests(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('threadId') threadId?: string,
    @Query('status') status?: string,
  ) {
    return this.commService.getEvidenceRequests({
      tenantId: req.user.tenantId,
      workspaceId,
      threadId,
      status,
    });
  }

  @Put('evidence/:requestId/status')
  @ApiOperation({ summary: 'Update evidence request status' })
  async updateEvidenceStatus(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body() body: {
      status: string;
      documentId?: string;
      rejectReason?: string;
    },
  ) {
    return this.commService.updateEvidenceStatus({
      tenantId: req.user.tenantId,
      requestId,
      status: body.status,
      userId: req.user.id,
      documentId: body.documentId,
      rejectReason: body.rejectReason,
    });
  }

  // ===== Notice Integration =====

  @Post('from-notice/:noticeId')
  @ApiOperation({ summary: 'Create communication thread from notice' })
  async createFromNotice(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Body() body: { message?: string },
  ) {
    return this.commService.createThreadFromNotice({
      tenantId: req.user.tenantId,
      noticeId,
      userId: req.user.id,
      message: body.message,
    });
  }

  // ===== AI Summary =====

  @Get(':threadId/summary')
  @ApiOperation({ summary: 'Get AI summary of thread' })
  async summarizeThread(@Request() req: any, @Param('threadId') threadId: string) {
    return this.commService.summarizeThread({
      tenantId: req.user.tenantId,
      threadId,
      userId: req.user.id,
    });
  }
}