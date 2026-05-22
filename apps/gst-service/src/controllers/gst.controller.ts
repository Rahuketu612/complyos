import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GstService } from '../services/gst.service';
import { CreateReturnDto, ReturnFilterDto, NoticeFilterDto } from '../dto/create-return.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('GST')
@Controller(':businessId/gst')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GstController {
  constructor(private gstService: GstService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @Header('Cache-Control', 'no-cache')
  async health() {
    return { status: 'healthy', service: 'gst', timestamp: new Date().toISOString() };
  }

  @Get('returns')
  @ApiOperation({ summary: 'List GST returns' })
  async getReturns(
    @Param('businessId') businessId: string,
    @Query() filter: any,
  ) {
    return this.gstService.findReturns(businessId, filter);
  }

  @Post('returns')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({ summary: 'Record GST return' })
  async createReturn(
    @Param('businessId') businessId: string,
    @Body() dto: CreateReturnDto,
    @CurrentUser() user: any,
  ) {
    return this.gstService.createReturn(businessId, dto, user.tenantId, user.id);
  }

  @Get('returns/dashboard')
  @ApiOperation({ summary: 'Get return dashboard' })
  async getReturnDashboard(@Param('businessId') businessId: string) {
    return this.gstService.getReturnDashboard(businessId);
  }

  @Get('notices')
  @ApiOperation({ summary: 'List GST notices' })
  async getNotices(
    @Param('businessId') businessId: string,
    @Query() filter: NoticeFilterDto,
  ) {
    return this.gstService.findNotices(businessId, filter);
  }

  @Get('notices/dashboard')
  @ApiOperation({ summary: 'Get notice dashboard' })
  async getNoticeDashboard(@Param('businessId') businessId: string) {
    return this.gstService.getNoticeDashboard(businessId);
  }

  @Get('notices/:id')
  @ApiOperation({ summary: 'Get notice details' })
  async getNotice(@Param('id') id: string) {
    return this.gstService.getNotice(id);
  }

  @Patch('notices/:id/status')
  @ApiOperation({ summary: 'Update notice status' })
  async updateNoticeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.gstService.updateNoticeStatus(id, status, user.id);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get GST ledger' })
  async getLedger(
    @Param('businessId') businessId: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.gstService.getLedger(
      businessId, 
      type, 
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('ledger/summary')
  @ApiOperation({ summary: 'Get ledger summary' })
  async getLedgerSummary(@Param('businessId') businessId: string) {
    return this.gstService.getLedgerSummary(businessId);
  }
}