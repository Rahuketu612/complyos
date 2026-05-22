import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NoticeService {
  constructor(private prisma: PrismaService) {}

  async createNotice(
    tenantId: string,
    userId: string,
    workspaceId: string,
    dto: {
      businessId?: string;
      noticeNumber?: string;
      noticeType?: string;
      issuingAuthority?: string;
      assessmentYear?: string;
      severity?: string;
      status?: string;
      responseDueDate?: Date;
      demandAmount?: number;
      penaltyAmount?: number;
      interestAmount?: number;
      subject: string;
      summary?: string;
      groundsOfNotice?: string;
      assignedTo?: string;
    },
  ) {
    // Validate workspace access
    const workspace = await this.prisma.clientWorkspace.findFirst({
      where: { id: workspaceId, tenantId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const totalLiability = (dto.demandAmount || 0) + (dto.penaltyAmount || 0) + (dto.interestAmount || 0);

    const notice = await this.prisma.notice.create({
      data: {
        workspaceId,
        tenantId,
        businessId: dto.businessId,
        noticeNumber: dto.noticeNumber,
        noticeType: (dto.noticeType as any) || 'GST_SCRUTINY',
        issuingAuthority: dto.issuingAuthority,
        assessmentYear: dto.assessmentYear,
        severity: (dto.severity as any) || 'MEDIUM',
        status: (dto.status as any) || 'RECEIVED',
        responseDueDate: dto.responseDueDate,
        demandAmount: dto.demandAmount ? new Prisma.Decimal(dto.demandAmount) : undefined,
        penaltyAmount: dto.penaltyAmount ? new Prisma.Decimal(dto.penaltyAmount) : undefined,
        interestAmount: dto.interestAmount ? new Prisma.Decimal(dto.interestAmount) : undefined,
        totalLiability: totalLiability ? new Prisma.Decimal(totalLiability) : undefined,
        subject: dto.subject,
        summary: dto.summary,
        groundsOfNotice: dto.groundsOfNotice,
        assignedTo: dto.assignedTo,
        assignedAt: dto.assignedTo ? new Date() : undefined,
      },
      include: {
        workspace: { include: { firm: true } },
        business: true,
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { activities: true, linkedDocuments: true, linkedTasks: true } },
      },
    });

    // Create activity
    await this.prisma.noticeActivity.create({
      data: {
        noticeId: notice.id,
        tenantId,
        action: 'CREATED',
        comment: `Notice created: ${dto.subject}`,
        createdBy: userId,
        metadata: { noticeType: dto.noticeType, severity: dto.severity },
      },
    });

    return notice;
  }

  async listNotices(
    tenantId: string,
    userId: string,
    filters: {
      status?: string;
      severity?: string;
      noticeType?: string;
      workspaceId?: string;
      assignedTo?: string;
      dueBefore?: Date;
      dueAfter?: Date;
      search?: string;
    },
  ) {
    const where: any = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.noticeType) where.noticeType = filters.noticeType;
    if (filters.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.dueBefore) where.responseDueDate = { lte: filters.dueBefore };
    if (filters.dueAfter) where.responseDueDate = { ...where.responseDueDate, gte: filters.dueAfter };
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { noticeNumber: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [notices, summary] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { responseDueDate: 'asc' }],
        include: {
          workspace: { include: { firm: true } },
          business: { select: { id: true, name: true, pan: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.getNoticeSummary(tenantId),
    ]);

    return { notices, summary };
  }

  async getNoticeDashboard(tenantId: string) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [notices, summary] = await Promise.all([
      // Due this week
      this.prisma.notice.findMany({
        where: {
          tenantId,
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lte: weekFromNow, gte: now },
        },
        include: { workspace: true, business: true },
        orderBy: { responseDueDate: 'asc' },
        take: 10,
      }),
      // High severity
      this.prisma.notice.findMany({
        where: { tenantId, severity: { in: ['HIGH', 'CRITICAL'] } },
        include: { workspace: true, business: true },
        orderBy: { severity: 'desc' },
        take: 5,
      }),
    ]);

    const summaryData = await this.getNoticeSummary(tenantId);

    // By authority
    const byAuthority = await this.prisma.notice.groupBy({
      by: ['issuingAuthority'],
      where: { tenantId, issuingAuthority: { not: null } },
      _count: true,
      orderBy: { _count: { issuingAuthority: 'desc' } },
      take: 5,
    });

    return {
      dueThisWeek: notices,
      highSeverity: summaryData.highSeverity,
      highSeverityNotices: summaryData.highSeverityNotices,
      overdue: summaryData.overdue,
      overdueNotices: summaryData.overdueNotices,
      byAuthority,
      summary: summaryData,
    };
  }

  private async getNoticeSummary(tenantId: string) {
    const now = new Date();

    const [total, byStatus, bySeverity, overdue, dueThisWeek, byAuthority] = await Promise.all([
      this.prisma.notice.count({ where: { tenantId } }),
      this.prisma.notice.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.notice.groupBy({
        by: ['severity'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.notice.count({
        where: {
          tenantId,
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lt: now },
        },
      }),
      this.prisma.notice.findMany({
        where: {
          tenantId,
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lt: now },
        },
        include: { workspace: true, business: true },
        orderBy: { responseDueDate: 'asc' },
        take: 5,
      }),
      this.prisma.notice.groupBy({
        by: ['issuingAuthority'],
        where: { tenantId, issuingAuthority: { not: null } },
        _count: true,
        orderBy: { _count: { issuingAuthority: 'desc' } },
      }),
    ]);

    const statusMap = byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {});
    const severityMap = bySeverity.reduce((acc, s) => ({ ...acc, [s.severity]: s._count }), {});

    const highSeverityNotices = await this.prisma.notice.findMany({
      where: { tenantId, severity: { in: ['HIGH', 'CRITICAL'] }, status: { notIn: ['RESPONSE_FILED', 'CLOSED'] } },
      include: { workspace: true, business: true },
      take: 5,
    });

    return {
      total,
      byStatus: statusMap,
      bySeverity: severityMap,
      overdue,
      overdueNotices: dueThisWeek,
      dueThisWeekCount: await this.prisma.notice.count({
        where: {
          tenantId,
          status: { notIn: ['RESPONSE_FILED', 'CLOSED'] },
          responseDueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), gte: now },
        },
      }),
      highSeverity: (severityMap['HIGH'] || 0) + (severityMap['CRITICAL'] || 0),
      highSeverityNotices,
      byAuthority,
    };
  }

  async getNotice(tenantId: string, noticeId: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
      include: {
        workspace: { include: { firm: true } },
        business: { select: { id: true, name: true, pan: true, gstin: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        activities: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        linkedDocuments: {
          include: {
            document: true,
            linker: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        linkedTasks: {
          include: {
            task: { include: { assignee: { select: { id: true, firstName: true, lastName: true } } } },
            linker: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    return notice;
  }

  async updateNotice(
    tenantId: string,
    userId: string,
    noticeId: string,
    dto: {
      noticeNumber?: string;
      noticeType?: string;
      issuingAuthority?: string;
      assessmentYear?: string;
      severity?: string;
      status?: string;
      responseDueDate?: Date;
      demandAmount?: number;
      penaltyAmount?: number;
      interestAmount?: number;
      subject?: string;
      summary?: string;
      groundsOfNotice?: string;
      assignedTo?: string;
      resolutionNotes?: string;
    },
  ) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    const updateData: any = { ...dto };

    // Handle status changes
    if (dto.status && dto.status !== notice.status) {
      await this.prisma.noticeActivity.create({
        data: {
          noticeId,
          tenantId,
          action: 'STATUS_CHANGED',
          previousValue: notice.status,
          newValue: dto.status,
          comment: `Status changed from ${notice.status} to ${dto.status}`,
          createdBy: userId,
        },
      });

      if (dto.status === 'CLOSED') {
        updateData.closureDate = new Date();
      }
    }

    // Handle assignment changes
    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo && dto.assignedTo !== notice.assignedTo) {
        await this.prisma.noticeActivity.create({
          data: {
            noticeId,
            tenantId,
            action: 'ASSIGNED',
            newValue: dto.assignedTo,
            comment: `Notice assigned to user`,
            createdBy: userId,
          },
        });
        updateData.assignedAt = new Date();
      } else if (!dto.assignedTo && notice.assignedTo) {
        await this.prisma.noticeActivity.create({
          data: {
            noticeId,
            tenantId,
            action: 'UNASSIGNED',
            previousValue: notice.assignedTo,
            comment: `Notice unassigned`,
            createdBy: userId,
          },
        });
      }
    }

    // Calculate total liability
    const demandAmount = dto.demandAmount ?? (Number(notice.demandAmount) || 0);
    const penaltyAmount = dto.penaltyAmount ?? (Number(notice.penaltyAmount) || 0);
    const interestAmount = dto.interestAmount ?? (Number(notice.interestAmount) || 0);
    updateData.totalLiability = new Prisma.Decimal(demandAmount + penaltyAmount + interestAmount);

    const updated = await this.prisma.notice.update({
      where: { id: noticeId },
      data: updateData,
      include: {
        workspace: { include: { firm: true } },
        business: { select: { id: true, name: true, pan: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Create update activity
    await this.prisma.noticeActivity.create({
      data: {
        noticeId,
        tenantId,
        action: 'UPDATED',
        comment: 'Notice details updated',
        createdBy: userId,
      },
    });

    return updated;
  }

  async addComment(tenantId: string, userId: string, noticeId: string, dto: { comment: string; correlationId?: string }) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    return this.prisma.noticeActivity.create({
      data: {
        noticeId,
        tenantId,
        action: 'COMMENT',
        comment: dto.comment,
        correlationId: dto.correlationId,
        createdBy: userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async linkDocument(
    tenantId: string,
    userId: string,
    noticeId: string,
    dto: { documentId: string; notes?: string },
  ) {
    const [notice, document] = await Promise.all([
      this.prisma.notice.findFirst({ where: { id: noticeId, tenantId } }),
      this.prisma.documentVault.findFirst({ where: { id: dto.documentId, tenantId } }),
    ]);

    if (!notice) throw new NotFoundException('Notice not found');
    if (!document) throw new NotFoundException('Document not found');

    const link = await this.prisma.noticeDocument.create({
      data: {
        noticeId,
        documentId: dto.documentId,
        linkedBy: userId,
        notes: dto.notes,
      },
      include: {
        document: true,
        linker: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.noticeActivity.create({
      data: {
        noticeId,
        tenantId,
        action: 'DOCUMENT_LINKED',
        comment: `Document linked: ${document.fileName}`,
        newValue: dto.documentId,
        createdBy: userId,
      },
    });

    return link;
  }

  async unlinkDocument(tenantId: string, userId: string, noticeId: string, documentId: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
    });
    if (!notice) throw new NotFoundException('Notice not found');

    const link = await this.prisma.noticeDocument.findUnique({
      where: { noticeId_documentId: { noticeId, documentId } },
      include: { document: true },
    });
    if (!link) throw new NotFoundException('Document link not found');

    await this.prisma.noticeDocument.delete({
      where: { noticeId_documentId: { noticeId, documentId } },
    });

    await this.prisma.noticeActivity.create({
      data: {
        noticeId,
        tenantId,
        action: 'DOCUMENT_UNLINKED',
        comment: `Document unlinked: ${link.document.fileName}`,
        previousValue: documentId,
        createdBy: userId,
      },
    });

    return { success: true };
  }

  async createTaskFromNotice(
    tenantId: string,
    userId: string,
    noticeId: string,
    dto: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: Date;
      assignedTo?: string;
    },
  ) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
    });
    if (!notice) throw new NotFoundException('Notice not found');

    const task = await this.prisma.complianceTask.create({
      data: {
        workspaceId: notice.workspaceId,
        tenantId,
        title: dto.title,
        description: dto.description || `Related to notice: ${notice.subject}`,
        status: 'PENDING',
        priority: (dto.priority as any) || 'MEDIUM',
        complianceType: notice.noticeType?.startsWith('INCOME_TAX') ? 'INCOME_TAX' : 'GST',
        dueDate: dto.dueDate || notice.responseDueDate,
        createdBy: userId,
        assignedTo: dto.assignedTo || notice.assignedTo,
        linkedBusinessId: notice.businessId,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Link task to notice
    await this.prisma.noticeTask.create({
      data: {
        noticeId,
        taskId: task.id,
        linkedBy: userId,
      },
    });

    await this.prisma.noticeActivity.create({
      data: {
        noticeId,
        tenantId,
        action: 'TASK_CREATED',
        comment: `Task created: ${task.title}`,
        newValue: task.id,
        createdBy: userId,
      },
    });

    return task;
  }

  async getNoticeActivities(tenantId: string, noticeId: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
    });
    if (!notice) throw new NotFoundException('Notice not found');

    return this.prisma.noticeActivity.findMany({
      where: { noticeId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}