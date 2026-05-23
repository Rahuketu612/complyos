/**
 * Pilot Metrics Service - Admin-only lightweight metrics for beta pilots
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PilotMetrics {
  // User metrics
  activeUsers: number;
  totalUsers: number;
  
  // Workspace metrics
  activeWorkspaces: number;
  totalWorkspaces: number;
  
  // AI usage
  aiUsageCount: number;
  aiUsageTrend: 'up' | 'down' | 'stable';
  
  // Notice metrics
  noticesResolved: number;
  noticesPending: number;
  noticesCritical: number;
  
  // Task metrics
  overdueTasks: number;
  completedTasks: number;
  pendingTasks: number;
  
  // Activity
  recentLogins: number;
  lastActiveAt: Date;
  
  // Feedback
  openFeedback: number;
  resolvedFeedback: number;
}

@Injectable()
export class PilotMetricsService {
  private readonly logger = new Logger(PilotMetricsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive pilot metrics for tenant
   */
  async getMetrics(tenantId: string, days: number = 7): Promise<PilotMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    // Parallel queries for performance
    const [
      users,
      workspaces,
      aiEvents,
      aiEvents30,
      notices,
      tasks,
      recentLogins,
      feedback,
    ] = await Promise.all([
      // Users
      this.prisma.user.findMany({
        where: { tenantId },
        select: { id: true, status: true },
      }),
      
      // Workspaces
      this.prisma.clientWorkspace.findMany({
        where: { tenantId },
        select: { id: true, status: true },
      }),
      
      // AI events (last 7 days)
      this.prisma.analyticsEvent.count({
        where: { tenantId, eventType: { contains: 'ai_' }, createdAt: { gte: since } },
      }),
      
      // AI events (last 30 days) for trend
      this.prisma.analyticsEvent.count({
        where: { tenantId, eventType: { contains: 'ai_' }, createdAt: { gte: since30 } },
      }),
      
      // Notices stats - fetch as JSON to avoid type issues
      this.prisma.$queryRaw<Array<{status: string, severity: string}>>`
        SELECT status, severity FROM "Notice" WHERE "tenantId" = ${tenantId}
      ` as Promise<Array<{status: string, severity: string}>>,
      
      // Tasks stats - fetch as JSON
      this.prisma.$queryRaw<Array<{status: string, "dueDate": Date | null}>>`
        SELECT status, "dueDate" FROM "ComplianceTask" WHERE "tenantId" = ${tenantId}
      ` as Promise<Array<{status: string, dueDate: Date | null}>>,
      
      // Recent logins (last 7 days)
      this.prisma.analyticsEvent.count({
        where: { tenantId, eventType: 'user_login', createdAt: { gte: since } },
      }),
      
      // Feedback stats - fetch as JSON
      this.prisma.$queryRaw<Array<{status: string}>>`
        SELECT status FROM "Feedback" WHERE "tenantId" = ${tenantId}
      ` as Promise<Array<{status: string}>>,
    ]);

    const activeUsers = users.filter(u => u.status === 'active').length;
    const activeWorkspaces = workspaces.filter(w => w.status === 'active').length;

    // Calculate AI trend
    const ai7DayAvg = Math.ceil(aiEvents / 7);
    const ai30DayAvg = Math.ceil(aiEvents30 / 30);
    let aiUsageTrend: 'up' | 'down' | 'stable' = 'stable';
    if (ai7DayAvg > ai30DayAvg * 1.2) aiUsageTrend = 'up';
    else if (ai7DayAvg < ai30DayAvg * 0.8) aiUsageTrend = 'down';

    // Notice metrics
    const noticesPending = notices.filter(n => 
      n.status === 'RECEIVED' || n.status === 'UNDER_REVIEW' || n.status === 'CLIENT_PENDING'
    ).length;
    const noticesCritical = notices.filter(n => 
      n.severity === 'CRITICAL' || n.severity === 'HIGH'
    ).length;
    const noticesResolved = notices.filter(n => n.status === 'RESOLVED').length;

    // Task metrics
    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED'
    ).length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;

    // Feedback metrics
    const openFeedback = feedback.filter(f => 
      f.status === 'OPEN' || f.status === 'IN_PROGRESS'
    ).length;
    const resolvedFeedback = feedback.filter(f => f.status === 'RESOLVED').length;

    // Get last activity
    const lastEvent = await this.prisma.analyticsEvent.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      activeUsers,
      totalUsers: users.length,
      activeWorkspaces,
      totalWorkspaces: workspaces.length,
      aiUsageCount: aiEvents,
      aiUsageTrend,
      noticesResolved,
      noticesPending,
      noticesCritical,
      overdueTasks,
      completedTasks,
      pendingTasks,
      recentLogins,
      lastActiveAt: lastEvent?.createdAt || new Date(),
      openFeedback,
      resolvedFeedback,
    };
  }

  /**
   * Get activity trends for dashboard
   */
  async getActivityTrends(tenantId: string, days: number = 30): Promise<{
    dates: string[];
    logins: number[];
    actions: number[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.analyticsEvent.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { eventType: true, eventCategory: true, createdAt: true },
    });

    // Group by date
    const loginByDate: Record<string, number> = {};
    const actionByDate: Record<string, number> = {};

    for (const event of events) {
      const date = event.createdAt.toISOString().split('T')[0];
      if (event.eventType === 'user_login') {
        loginByDate[date] = (loginByDate[date] || 0) + 1;
      } else if (event.eventCategory === 'action') {
        actionByDate[date] = (actionByDate[date] || 0) + 1;
      }
    }

    // Generate date range
    const dates: string[] = [];
    const logins: number[] = [];
    const actions: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      logins.push(loginByDate[dateStr] || 0);
      actions.push(actionByDate[dateStr] || 0);
    }

    return { dates, logins, actions };
  }
}
