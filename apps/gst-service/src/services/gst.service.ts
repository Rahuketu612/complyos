import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto, NoticeFilterDto } from '../dto/create-return.dto';

/**
 * GST Intelligence Service
 * 
 * Handles:
 * - GST Return tracking (GSTR-1, 3B, etc.)
 * - GST Notice management
 * - GST Ledger monitoring
 * - Filing due dates calculation
 */
@Injectable()
export class GstService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // GST RETURNS
  // ========================================

  async findReturns(businessId: string, filter?: any) {
    const where: any = { businessId };
    
    if (filter?.formType) {
      where.formType = filter.formType;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.financialYear) {
      where.financialYear = filter.financialYear;
    }

    return this.prisma.gstReturn.findMany({
      where,
      orderBy: [{ taxPeriod: 'desc' }],
      take: 100,
    });
  }

  async createReturn(businessId: string, dto: CreateReturnDto) {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check for duplicates
    const existing = await this.prisma.gstReturn.findUnique({
      where: {
        businessId_formType_taxPeriod: {
          businessId,
          formType: dto.formType,
          taxPeriod: dto.taxPeriod,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`${dto.formType} for ${dto.taxPeriod} already exists`);
    }

    // Calculate due date
    const dueDate = this.calculateDueDate(dto.formType, dto.taxPeriod);

    const gstReturn = await this.prisma.gstReturn.create({
      data: {
        businessId,
        financialYear: dto.financialYear || this.getFinancialYear(dto.taxPeriod),
        taxPeriod: dto.taxPeriod,
        formType: dto.formType,
        dueDate,
        ...dto,
      },
    });

    // Update business with latest filing info
    await this.updateBusinessFilingInfo(businessId, dto.formType, dto.status);

    // Create timeline event
    await this.createTimelineEvent(business.gstin, businessId, 'return_filed', {
      form: dto.formType,
      period: dto.taxPeriod,
      status: dto.status,
    });

    return gstReturn;
  }

  async getReturnDashboard(businessId: string) {
    const returns = await this.prisma.gstReturn.findMany({
      where: { businessId },
      orderBy: [{ taxPeriod: 'desc' }],
      take: 24,
    });

    // Group by status
    const stats = {
      filed: returns.filter(r => r.status === 'filed').length,
      pending: returns.filter(r => r.status === 'not_filed').length,
      late: returns.filter(r => r.status === 'late_filed').length,
      processing: returns.filter(r => r.status === 'processing').length,
    };

    // Calculate filing rate (last 12 periods)
    const recentReturns = returns.slice(0, 12);
    const filed = recentReturns.filter(r => r.status === 'filed').length;
    const filingRate = recentReturns.length > 0 
      ? ((filed / recentReturns.length) * 100).toFixed(1) 
      : '0';

    // Get upcoming due dates
    const upcoming = await this.getUpcomingDueDates(businessId);

    return {
      statistics: stats,
      filingRate,
      upcoming,
      recentFilings: returns.slice(0, 5).map(r => ({
        period: r.taxPeriod,
        form: r.formType,
        status: r.status,
        filedDate: r.filedDate,
      })),
    };
  }

  // ========================================
  // GST NOTICES
  // ========================================

  async findNotices(businessId: string, filter: NoticeFilterDto) {
    const where: any = { businessId };
    
    if (filter?.noticeType) {
      where.noticeType = filter.noticeType;
    }
    if (filter?.severity) {
      where.severity = filter.severity;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.notice.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });
  }

  async getNotice(id: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            name: true,
            gstin: true,
            pan: true,
          },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    return notice;
  }

  async updateNoticeStatus(id: string, status: string, userId?: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    const updateData: any = { status };

    if (status === 'response_submitted') {
      updateData.responseDate = new Date();
    } else if (status === 'resolved') {
      updateData.resolvedDate = new Date();
    }

    return this.prisma.notice.update({
      where: { id },
      data: updateData,
    });
  }

  async getNoticeDashboard(businessId: string) {
    const notices = await this.prisma.notice.findMany({
      where: { businessId },
      orderBy: [{ createdAt: 'desc' }],
    });

    const bySeverity = {
      critical: notices.filter(n => n.severity === 'critical').length,
      high: notices.filter(n => n.severity === 'high').length,
      medium: notices.filter(n => n.severity === 'medium').length,
      low: notices.filter(n => n.severity === 'low').length,
    };

    const byStatus = {
      open: notices.filter(n => 
        ['received', 'under_review', 'response_drafting'].includes(n.status)
      ).length,
      resolved: notices.filter(n => n.status === 'resolved').length,
      disputed: notices.filter(n => ['pending_payment', 'disputed'].includes(n.status)).length,
    };

    const totalExposure = notices.reduce(
      (sum, n) => sum + (Number(n.totalAmount) || 0), 
      0
    );

    // Get urgent notices
    const today = new Date();
    const urgentNotices = notices.filter(n => {
      if (!n.dueDate) return false;
      const daysUntilDue = Math.ceil(
        (new Date(n.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue <= 7 && !['resolved', 'appeal_filed'].includes(n.status);
    });

    return {
      total: notices.length,
      bySeverity,
      byStatus,
      totalExposure,
      urgentNotices: urgentNotices.slice(0, 5).map(n => ({
        id: n.id,
        title: n.title,
        type: n.noticeType,
        dueDate: n.dueDate,
        amount: n.totalAmount,
      })),
    };
  }

  // ========================================
  // GST LEDGER
  // ========================================

  async getLedger(businessId: string, ledgerType?: string, startDate?: Date, endDate?: Date) {
    const where: any = { businessId };
    
    if (ledgerType) {
      where.ledgerType = ledgerType;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.gstLedger.findMany({
      where,
      orderBy: [{ date: 'desc' }],
      take: 500,
    });
  }

  async getLedgerSummary(businessId: string) {
    const [cashBalance, creditTotal, liabilitySummary] = await Promise.all([
      this.prisma.gstLedger.aggregate({
        where: { businessId, ledgerType: 'cash' },
        _sum: { amount: true },
      }),
      this.prisma.gstLedger.aggregate({
        where: { businessId, ledgerType: 'credit' },
        _sum: { amount: true },
      }),
      this.prisma.gstLedger.groupBy({
        by: ['ledgerType'],
        where: { businessId },
        _sum: {
          sgst: true,
          cgst: true,
          igst: true,
        },
      }),
    ]);

    return {
      cashBalance: cashBalance._sum.amount || 0,
      creditBalance: creditTotal._sum.amount || 0,
      liabilities: {
        sgst: liabilitySummary.find(l => l.ledgerType === 'liability')?._sum.sgst || 0,
        cgst: liabilitySummary.find(l => l.ledgerType === 'liability')?._sum.cgst || 0,
        igst: liabilitySummary.find(l => l.ledgerType === 'liability')?._sum.igst || 0,
      },
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private calculateDueDate(formType: string, taxPeriod: string): Date {
    const period = taxPeriod;
    const [year, month] = period.split('-').map(Number);
    
    let dueDate: Date;
    
    switch (formType) {
      case 'GSTR_1':
        // Due on 11th of next month for regular
        dueDate = month === 12
          ? new Date(year + 1, 0, 11)
          : new Date(year, month, 11);
        
        // Adjust for quarterly for QRMP
        break;
        
      case 'GSTR_3B':
        // Due on 20th of next month (or 22nd for quarterly)
        dueDate = month === 12
          ? new Date(year + 1, 0, 20)
          : new Date(year, month, 20);
        break;
        
      case 'GSTR_9':
        // Annual return - due December 31 of next FY
        dueDate = new Date(year + 1, 11, 31);
        break;
        
      case 'GSTR_9C':
        // Audit return - due December 31 of next FY
        dueDate = new Date(year + 1, 11, 31);
        break;
        
      default:
        dueDate = new Date(year + 1, month, 15);
    }

    // Adjust for weekend
    if (dueDate.getDay() === 0) { // Sunday
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (dueDate.getDay() === 6) { // Saturday
      dueDate.setDate(dueDate.getDate() + 2);
    }

    return dueDate;
  }

  private getFinancialYear(taxPeriod: string): string {
    const [, month] = taxPeriod.split('-').map(Number);
    const year = parseInt(taxPeriod.split('-')[0]);
    
    // April falls in current FY, rest in next
    if (month >= 4) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  }

  private async getUpcomingDueDates(businessId: string): Promise<any[]> {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const returns = await this.prisma.gstReturn.findMany({
      where: {
        businessId,
        status: { in: ['not_filed', 'pending'] },
        dueDate: {
          gte: today,
          lte: thirtyDaysLater,
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    return returns.map(r => ({
      form: r.formType,
      period: r.taxPeriod,
      dueDate: r.dueDate,
      daysRemaining: Math.ceil(
        (new Date(r.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  private async updateBusinessFilingInfo(
    businessId: string, 
    formType: string, 
    status: string,
  ) {
    const updateData: any = {};
    
    if (formType === 'GSTR_1') {
      updateData.lastGstr1FiledDate = new Date();
    } else if (formType === 'GSTR_3B') {
      updateData.lastGstr3BFiledDate = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: updateData,
      });
    }
  }

  private async createTimelineEvent(
    gstin: string,
    businessId: string,
    eventType: string,
    metadata: any,
  ) {
    await this.prisma.timelineEvent.create({
      data: {
        tenantId: '', // Will be filled from business relation
        businessId,
        eventType: eventType as any,
        title: this.getEventTitle(eventType),
        metadata,
        severity: 'info',
      },
    }).catch(() => {});
  }

  private getEventTitle(eventType: string): string {
    const titles: Record<string, string> = {
      return_filed: 'GST Return Filed',
      return_latefiled: 'GST Return Filed Late',
      return_not_filed: 'GST Return Not Filed',
      notice_received: 'GST Notice Received',
    };
    return titles[eventType] || 'GST Activity';
  }
}