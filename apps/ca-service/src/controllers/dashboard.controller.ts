import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../services/workspace.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
  ) {}

  @Get('widgets')
  @ApiOperation({ summary: 'Get dashboard widgets data' })
  async getWidgets(@Request() req: any) {
    const { tenantId, id: userId } = req.user;

    // Get user's workspaces
    const workspaces = await this.workspaceService.listWorkspaces(tenantId, userId);
    const workspaceIds = workspaces.map((w: any) => w.id);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Pending tasks widget
    const pendingTasks = await this.prisma.complianceTask.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        workspace: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
    });

    // Overdue compliances
    const overdueTasks = await this.prisma.complianceTask.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    // Recent notices (from existing Notice model)
    const recentNotices = await this.prisma.notice.findMany({
      where: {
        business: {
          workspaces: { some: { id: { in: workspaceIds } } },
        },
      },
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // MSME payment alerts (from vendors with MSME registration)
    // Note: Simplified - actual invoice tracking would need vendor-invoice relation
    const msmeAlerts: any[] = [];

    // Upcoming returns
    const upcomingReturns = await this.prisma.gstReturn.findMany({
      where: {
        business: {
          workspaces: { some: { id: { in: workspaceIds } } },
        },
        status: 'pending',
        dueDate: { lte: sevenDaysFromNow, gte: now },
      },
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    // Summary stats
    const stats = {
      totalWorkspaces: workspaces.length,
      activeWorkspaces: workspaces.filter((w: any) => w.status === 'active').length,
      totalTasks: await this.prisma.complianceTask.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      pendingTasksCount: pendingTasks.length,
      overdueTasksCount: overdueTasks.length,
      completedTasksCount: await this.prisma.complianceTask.count({
        where: { workspaceId: { in: workspaceIds }, status: 'COMPLETED' },
      }),
      documentsCount: await this.prisma.documentVault.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      unreadNotifications: await this.prisma.userNotification.count({
        where: { userId, isRead: false },
      }),
      // Notice stats
      noticesDueThisWeek: await this.prisma.notice.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lte: sevenDaysFromNow, gte: now },
        },
      }),
      noticesOverdue: await this.prisma.notice.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lt: now },
        },
      }),
      noticesHighSeverity: await this.prisma.notice.count({
        where: {
          workspaceId: { in: workspaceIds },
          severity: { in: ['HIGH', 'CRITICAL'] },
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
        },
      }),
      msmeAlerts: 0,
    };

    return {
      stats,
      pendingTasks: pendingTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        complianceType: t.complianceType,
        workspace: t.workspace,
        business: t.business,
      })),
      overdueCompliances: overdueTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        daysOverdue: Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
        workspace: t.workspace,
      })),
      recentNotices: recentNotices.map((n: any) => ({
        id: n.id,
        noticeType: n.noticeType,
        referenceNumber: n.referenceNumber,
        business: n.business,
        createdAt: n.createdAt,
      })),
      msmeAlerts: msmeAlerts
        .filter((v: any) => v.invoices.length > 0)
        .map((v: any) => ({
          vendorId: v.id,
          vendorName: v.businessName,
          msmeType: v.msmeType,
          overdueInvoicesCount: v.invoices.length,
          totalOverdueAmount: v.invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0),
        })),
      upcomingReturns: upcomingReturns.map((r: any) => ({
        id: r.id,
        formType: r.formType,
        period: r.period,
        dueDate: r.dueDate,
        business: r.business,
      })),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get quick stats' })
  async getStats(@Request() req: any) {
    const { tenantId, id: userId } = req.user;
    const workspaces = await this.workspaceService.listWorkspaces(tenantId, userId);
    const workspaceIds = workspaces.map((w: any) => w.id);

    return {
      workspaces: workspaces.length,
      tasks: {
        total: await this.prisma.complianceTask.count({ where: { workspaceId: { in: workspaceIds } } }),
        pending: await this.prisma.complianceTask.count({ 
          where: { workspaceId: { in: workspaceIds }, status: { in: ['PENDING', 'IN_PROGRESS'] } } 
        }),
        completed: await this.prisma.complianceTask.count({ 
          where: { workspaceId: { in: workspaceIds }, status: 'COMPLETED' } 
        }),
        overdue: await this.prisma.complianceTask.count({ 
          where: { 
            workspaceId: { in: workspaceIds }, 
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { lt: new Date() },
          } 
        }),
      },
      documents: await this.prisma.documentVault.count({ where: { workspaceId: { in: workspaceIds } } }),
      notifications: await this.prisma.userNotification.count({ where: { userId, isRead: false } }),
    };
  }
}