import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(tenantId: string, userId: string, options?: {
    workspaceId?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { tenantId, userId };
    
    if (options?.workspaceId) where.workspaceId = options.workspaceId;
    if (options?.isRead !== undefined) where.isRead = options.isRead;

    const [notifications, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.userNotification.count({ where }),
    ]);

    const unreadCount = await this.prisma.userNotification.count({
      where: { tenantId, userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    return this.prisma.userNotification.updateMany({
      where: { id: notificationId, tenantId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(tenantId: string, userId: string, workspaceId?: string) {
    const where: any = { tenantId, userId, isRead: false };
    if (workspaceId) where.workspaceId = workspaceId;

    return this.prisma.userNotification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(tenantId: string, userId: string, notificationId: string) {
    return this.prisma.userNotification.deleteMany({
      where: { id: notificationId, tenantId, userId },
    });
  }

  async createNotification(data: {
    tenantId: string;
    userId: string;
    workspaceId?: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    return this.prisma.userNotification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        workspaceId: data.workspaceId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        data: data.data,
      },
    });
  }

  async getUnreadCount(tenantId: string, userId: string) {
    return this.prisma.userNotification.count({
      where: { tenantId, userId, isRead: false },
    });
  }
}