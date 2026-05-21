import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { BusinessFilterDto } from '../dto/business-filter.dto';
import { calculateComplianceApplicability } from '../utils/business-rules';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBusinessDto, userId: string) {
    // Validate PAN uniqueness
    const existingPan = await this.prisma.business.findUnique({
      where: { pan: dto.pan },
    });

    if (existingPan) {
      throw new ConflictException('A business with this PAN already exists');
    }

    // Calculate compliance applicability
    const applicability = calculateComplianceApplicability(dto);

    // Determine entity constitution mapping
    const constitution = this.mapEntityType(dto.entityType);

    const business = await this.prisma.business.create({
      data: {
        tenantId,
        name: dto.name,
        tradeName: dto.tradeName,
        pan: dto.pan,
        panLinkedEmail: dto.panLinkedEmail,
        tan: dto.tan,
        cin: dto.cin,
        llpin: dto.llpin,
        gstin: dto.gstin,
        entityType: dto.entityType,
        dateOfIncorporation: dto.dateOfIncorporation,
        commencementDate: dto.commencementDate,
        industry: dto.industry,
        nicCode: dto.nicCode,
        sector: dto.sector,
        subSector: dto.subSector,
        annualTurnover: dto.annualTurnover,
        employeeCount: dto.employeeCount,
        registeredAddress: dto.registeredAddress,
        principalPlaceAddress: dto.principalPlaceAddress,
        contactPerson: dto.contactPerson,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        gstApplicable: applicability.gst,
        epfApplicable: applicability.epf,
        esicApplicable: applicability.esic,
        tdsApplicable: applicability.tds,
        ptApplicable: applicability.pt,
        complianceScore: 100, // New business starts at good score
        healthStatus: 'excellent',
        status: 'active',
      },
    });

    // Create registration entries automatically
    if (dto.gstin) {
      await this.prisma.registration.create({
        data: {
          businessId: business.id,
          type: 'GST',
          registrationNumber: dto.gstin,
          status: 'active',
        },
      });
    }

    if (dto.tan) {
      await this.prisma.registration.create({
        data: {
          businessId: business.id,
          type: 'TAN',
          registrationNumber: dto.tan,
          status: 'active',
        },
      });
    }

    // Create initial timeline event
    await this.createTimelineEvent(tenantId, business.id, userId, 'business_registered', {
      name: business.name,
      pan: business.pan,
      gstin: business.gstin,
    });

    return business;
  }

  async findAll(tenantId: string, filter: BusinessFilterDto) {
    const { search, status, page = 1, limit = 20 } = filter;

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { pan: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        include: {
          _count: {
            select: {
              notices: true,
              returns: true,
              vendors: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(businessId: string, tenantId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, tenantId },
      include: {
        registrations: true,
        _count: {
          select: {
            notices: true,
            returns: true,
            vendors: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async update(businessId: string, tenantId: string, dto: UpdateBusinessDto) {
    const business = await this.findOne(businessId, tenantId);

    // Recalculate applicability if scale changed
    let updatedData = { ...dto } as any;

    if (dto.annualTurnover || dto.employeeCount) {
      const applicability = calculateComplianceApplicability({
        ...business,
        ...dto,
      } as any);
      updatedData.gstApplicable = applicability.gst;
      updatedData.epfApplicable = applicability.epf;
      updatedData.esicApplicable = applicability.esic;
      updatedData.tdsApplicable = applicability.tds;
      updatedData.ptApplicable = applicability.pt;
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: updatedData,
    });
  }

  async delete(businessId: string, tenantId: string) {
    const business = await this.findOne(businessId, tenantId);

    // Soft delete
    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: 'closed' },
    });

    return { success: true };
  }

  async getDashboard(tenantId: string, businessId?: string) {
    const businessWhere: any = { tenantId };
    if (businessId) {
      businessWhere.id = businessId;
    }

    const [
      totalBusinesses,
      activeBusinesses,
      complianceStats,
      returnStats,
      noticeStats,
    ] = await Promise.all([
      this.prisma.business.count({ where: businessWhere }),
      this.prisma.business.count({
        where: { ...businessWhere, status: 'active' },
      }),
      this.prisma.business.aggregate({
        where: businessWhere,
        _avg: {
          complianceScore: true,
        },
      }),
      this.prisma.gstReturn.groupBy({
        by: ['status'],
        where: { business: businessWhere },
        _count: true,
      }),
      this.prisma.notice.groupBy({
        by: ['status'],
        where: { business: businessWhere },
        _count: true,
      }),
    ]);

    // Calculate summary
    const totalReturns =
      returnStats.reduce((sum, r) => sum + r._count, 0);
    const filedReturns = returnStats.find((r) => r.status === 'filed')?._count || 0;
    const returnsPending =
      returnStats.find((r) => r.status === 'not_filed')?._count || 0;

    const totalNotices =
      noticeStats.reduce((sum, n) => sum + n._count, 0);
    const unresolvedNotices = noticeStats
      .filter((n) => !['resolved', 'appeal_filed'].includes(n.status))
      .reduce((sum, n) => sum + n._count, 0);

    return {
      overview: {
        totalBusinesses,
        activeBusinesses,
        avgComplianceScore: complianceStats._avg.complianceScore || 0,
      },
      returns: {
        total: totalReturns,
        filed: filedReturns,
        pending: returnsPending,
        filingRate:
          totalReturns > 0 ? ((filedReturns / totalReturns) * 100).toFixed(1) : '0',
      },
      notices: {
        total: totalNotices,
        unresolved: unresolvedNotices,
      },
      health: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
      },
    };
  }

  async getBusinessSummary(businessId: string, tenantId: string) {
    const business = await this.findOne(businessId, tenantId);

    // Get recent activity
    const [recentReturns, recentNotices, vendorStats] = await Promise.all([
      this.prisma.gstReturn.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.notice.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.vendor.aggregate({
        where: { businessId },
        _count: true,
        _avg: {
          complianceScore: true,
        },
      }),
    ]);

    return {
      business: {
        id: business.id,
        name: business.name,
        pan: business.pan,
        gstin: business.gstin,
        complianceScore: business.complianceScore,
        healthStatus: business.healthStatus,
        applicability: {
          gst: business.gstApplicable,
          epf: business.epfApplicable,
          esic: business.esicApplicable,
          tds: business.tdsApplicable,
        },
      },
      recentReturns: recentReturns.map((r) => ({
        period: r.taxPeriod,
        form: r.formType,
        status: r.status,
        filedDate: r.filedDate,
      })),
      recentNotices: recentNotices.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.noticeType,
        severity: n.severity,
        status: n.status,
        dueDate: n.dueDate,
      })),
      vendors: {
        total: vendorStats._count,
        avgScore: vendorStats._avg.complianceScore || 0,
      },
    };
  }

  private mapEntityType(entityType: string): string {
    const mapping: Record<string, string> = {
      proprietary: 'Proprietorship',
      partnership: 'Partnership',
      private_limited: 'Private Limited Company',
      public_limited: 'Public Limited Company',
      huf: 'HUF',
      individual: 'Individual',
      trust: 'Trust',
      society: 'Society',
      nfp: 'Non-Profit Organisation',
      government: 'Government Entity',
      OTHER: 'Other',
    };
    return mapping[entityType] || 'Unknown';
  }

  private async createTimelineEvent(
    tenantId: string,
    businessId: string | null,
    userId: string | null,
    eventType: string,
    metadata: any,
  ) {
    await this.prisma.timelineEvent.create({
      data: {
        tenantId,
        businessId,
        userId,
        eventType: eventType as any,
        title: this.getEventTitle(eventType),
        description: this.getEventDescription(eventType, metadata),
        metadata,
        severity: 'info',
      },
    });
  }

  private getEventTitle(eventType: string): string {
    const titles: Record<string, string> = {
      business_registered: 'New Business Registered',
      business_updated: 'Business Updated',
      return_filed: 'Return Filed',
      notice_received: 'Notice Received',
    };
    return titles[eventType] || 'Activity';
  }

  private getEventDescription(eventType: string, metadata: any): string {
    switch (eventType) {
      case 'business_registered':
        return `${metadata.name} (PAN: ${metadata.pan}) registered`;
      default:
        return 'Activity recorded';
    }
  }
}