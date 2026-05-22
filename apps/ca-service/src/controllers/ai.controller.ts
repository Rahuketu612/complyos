import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIComplianceService } from '../services/ai-compliance.service';
import { AIProviderService } from '../services/ai-provider.service';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(
    private aiComplianceService: AIComplianceService,
    private aiProvider: AIProviderService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check AI service status' })
  async getStatus(@Request() req: any) {
    return {
      enabled: this.aiProvider.isEnabled(),
      provider: this.aiProvider.getProvider(),
      features: {
        noticeSummarization: this.aiProvider.isEnabled(),
        taskSuggestions: this.aiProvider.isEnabled(),
        dashboardInsights: this.aiProvider.isEnabled(),
        documentTagging: this.aiProvider.isEnabled(),
      },
    };
  }

  @Post('notices/:noticeId/summarize')
  @ApiOperation({ summary: 'Summarize a notice using AI' })
  async summarizeNotice(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
  ) {
    if (!this.aiProvider.isEnabled()) {
      return {
        success: true,
        isMock: true,
        message: 'AI features disabled. Using mock response.',
        data: null,
      };
    }

    try {
      const result = await this.aiComplianceService.summarizeNotice(
        req.user.tenantId,
        req.user.id,
        noticeId,
      );
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to summarize notice: ' + error.message, 500);
    }
  }

  @Post('notices/:noticeId/suggest-tasks')
  @ApiOperation({ summary: 'Suggest compliance tasks for a notice' })
  async suggestTasks(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
  ) {
    if (!this.aiProvider.isEnabled()) {
      return {
        success: true,
        isMock: true,
        message: 'AI features disabled. Using mock response.',
        data: [],
      };
    }

    try {
      const result = await this.aiComplianceService.suggestTasksFromNotice(
        req.user.tenantId,
        req.user.id,
        noticeId,
      );
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to suggest tasks: ' + error.message, 500);
    }
  }

  @Get('dashboard/insights')
  @ApiOperation({ summary: 'Get AI-powered dashboard insights' })
  async getDashboardInsights(
    @Request() req: any,
    @Body() body: { workspaceId?: string },
  ) {
    if (!this.aiProvider.isEnabled()) {
      return {
        success: true,
        isMock: true,
        message: 'AI features disabled. Using mock response.',
        data: { insights: [], summary: 'AI disabled' },
      };
    }

    try {
      const result = await this.aiComplianceService.getDashboardInsights(
        req.user.tenantId,
        req.user.id,
        body.workspaceId,
      );
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get insights: ' + error.message, 500);
    }
  }

  @Post('documents/:documentId/suggest-tags')
  @ApiOperation({ summary: 'Suggest tags for a document' })
  async suggestDocumentTags(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    if (!this.aiProvider.isEnabled()) {
      return {
        success: true,
        isMock: true,
        message: 'AI features disabled. Using mock response.',
        data: null,
      };
    }

    try {
      const result = await this.aiComplianceService.suggestDocumentTags(
        req.user.tenantId,
        req.user.id,
        documentId,
      );
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to suggest tags: ' + error.message, 500);
    }
  }

  @Get('action-logs')
  @ApiOperation({ summary: 'Get AI action logs for audit' })
  async getActionLogs(
    @Request() req: any,
    @Body() body: { limit?: number; promptType?: string },
  ) {
    // This would query the AIActionLog model
    // For now, return empty array as Prisma queries are handled in the service
    return {
      logs: [],
      message: 'Action logging enabled. View logs in database.',
    };
  }
}