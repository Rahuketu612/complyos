import { Controller, Get, Put, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async getNotifications(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationService.getNotifications(req.user.tenantId, req.user.id, {
      workspaceId,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.tenantId, req.user.id);
    return { count };
  }

  @Put(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Request() req: any, @Param('notificationId') notificationId: string) {
    return this.notificationService.markAsRead(req.user.tenantId, req.user.id, notificationId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any, @Query('workspaceId') workspaceId?: string) {
    return this.notificationService.markAllAsRead(req.user.tenantId, req.user.id, workspaceId);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Request() req: any, @Param('notificationId') notificationId: string) {
    return this.notificationService.deleteNotification(req.user.tenantId, req.user.id, notificationId);
  }
}