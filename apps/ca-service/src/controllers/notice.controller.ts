import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NoticeService } from '../services/notice.service';
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeQueryDto,
  AddNoticeCommentDto,
  LinkDocumentDto,
  CreateTaskFromNoticeDto,
} from '../dto/notice.dto';

@ApiTags('Notices')
@ApiBearerAuth()
@Controller('notices')
@UseGuards(JwtAuthGuard)
export class NoticeController {
  constructor(private noticeService: NoticeService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get notice dashboard stats' })
  async getDashboard(@Request() req: any) {
    return this.noticeService.getNoticeDashboard(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notice' })
  async createNotice(@Request() req: any, @Body() dto: CreateNoticeDto) {
    if (!dto.workspaceId) {
      throw new Error('workspaceId is required');
    }
    return this.noticeService.createNotice(req.user.tenantId, req.user.id, dto.workspaceId, {
      ...dto,
      responseDueDate: dto.responseDueDate ? new Date(dto.responseDueDate) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List notices' })
  async listNotices(
    @Request() req: any,
    @Query() query: NoticeQueryDto,
  ) {
    return this.noticeService.listNotices(req.user.tenantId, req.user.id, {
      ...query,
      dueBefore: query.dueBefore ? new Date(query.dueBefore) : undefined,
      dueAfter: query.dueAfter ? new Date(query.dueAfter) : undefined,
    });
  }

  @Get(':noticeId')
  @ApiOperation({ summary: 'Get notice details' })
  async getNotice(@Request() req: any, @Param('noticeId') noticeId: string) {
    return this.noticeService.getNotice(req.user.tenantId, noticeId);
  }

  @Put(':noticeId')
  @ApiOperation({ summary: 'Update notice' })
  async updateNotice(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Body() dto: UpdateNoticeDto,
  ) {
    return this.noticeService.updateNotice(req.user.tenantId, req.user.id, noticeId, {
      ...dto,
      responseDueDate: dto.responseDueDate ? new Date(dto.responseDueDate) : undefined,
    });
  }

  @Post(':noticeId/comments')
  @ApiOperation({ summary: 'Add comment to notice' })
  async addComment(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Body() dto: AddNoticeCommentDto,
  ) {
    return this.noticeService.addComment(req.user.tenantId, req.user.id, noticeId, dto);
  }

  @Post(':noticeId/documents')
  @ApiOperation({ summary: 'Link document to notice' })
  async linkDocument(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Body() dto: LinkDocumentDto,
  ) {
    return this.noticeService.linkDocument(req.user.tenantId, req.user.id, noticeId, dto);
  }

  @Delete(':noticeId/documents/:documentId')
  @ApiOperation({ summary: 'Unlink document from notice' })
  async unlinkDocument(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.noticeService.unlinkDocument(req.user.tenantId, req.user.id, noticeId, documentId);
  }

  @Post(':noticeId/tasks')
  @ApiOperation({ summary: 'Create compliance task from notice' })
  async createTaskFromNotice(
    @Request() req: any,
    @Param('noticeId') noticeId: string,
    @Body() dto: CreateTaskFromNoticeDto,
  ) {
    return this.noticeService.createTaskFromNotice(req.user.tenantId, req.user.id, noticeId, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Get(':noticeId/activities')
  @ApiOperation({ summary: 'Get notice activity timeline' })
  async getActivities(@Request() req: any, @Param('noticeId') noticeId: string) {
    return this.noticeService.getNoticeActivities(req.user.tenantId, noticeId);
  }
}