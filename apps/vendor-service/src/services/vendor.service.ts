import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateVendorDto, UpdateVendorDto, VendorFilterDto } from '../dto/create-vendor.dto';
import { calculateVendorRisk, calculateRiskLevel } from '../utils/risk-calculation';
import { getMsmePaymentSummary } from '../msme/payment-aging';

/**
 * Vendor Intelligence Service
 * 
 * Core functionality:
 * 1. Vendor Master Management
 * 2. GSTR-2B Invoice Import
 * 3. ITC Reconciliation Engine
 * 4. Vendor Risk Scoring
 * 5. Compliance Monitoring
 */
@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // VENDOR MANAGEMENT
  // ========================================

  async createVendor(tenantId: string, businessId: string, dto: CreateVendorDto, userId?: string) {
    // Check for existing vendor with same GSTIN
    const existing = await this.prisma.vendor.findFirst({
      where: {
        tenantId,
        businessId,
        gstin: dto.gstin,
      },
    });

    if (existing) {
      throw new ConflictException('Vendor with this GSTIN already exists for this business');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        tenantId,
        businessId,
        name: dto.name,
        tradeName: dto.tradeName,
        gstin: dto.gstin,
        pan: dto.pan,
        tan: dto.tan,
        address: dto.address,
        state: dto.state,
        pincode: dto.pincode,
        entityType: dto.entityType as Prisma.VendorCreateInput['entityType'],
        // MSME fields
        msmeRegistered: dto.msmeRegistered ?? false,
        udyamNumber: dto.udyamNumber,
        msmeType: dto.msmeType as any,
        paymentDueDays: dto.paymentDueDays ?? 30,
        riskLevel: 'low_risk',
        complianceScore: 75, // Default score
      },
    });

    // Audit log for vendor creation with event category
    await this.logAudit(tenantId, userId, 'vendor_created', 'Vendor', vendor.id, {
      name: dto.name,
      gstin: dto.gstin,
      state: dto.state,
      msmeRegistered: dto.msmeRegistered,
      msmeType: dto.msmeType,
    });

    return vendor;
  }

  async findVendors(tenantId: string, businessId: string, filter: VendorFilterDto) {
    const where: any = { tenantId, businessId };

    if (filter?.riskLevel) {
      where.riskLevel = filter.riskLevel;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { gstin: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        orderBy: [{ complianceScore: 'asc' }],
        take: filter?.limit || 20,
        skip: filter?.page ? (filter.page - 1) * (filter.limit || 20) : 0,
        include: {
          _count: { select: { invoices: true } },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Add MSME payment summary to vendors with invoices
    const vendorsWithAging = await Promise.all(
      vendors.map(async (vendor) => {
        const enriched = { ...vendor };
        
        // Get recent invoices for MSME aging calculation
        if (vendor._count.invoices > 0 && vendor.msmeRegistered) {
          const invoices = await this.prisma.gstr2bInvoice.findMany({
            where: { vendorId: vendor.id },
            orderBy: { invoiceDate: 'desc' },
            take: 10,
            select: {
              invoiceDate: true,
              invoiceValue: true,
            },
          });

          // Mock due dates based on payment terms
          const invoiceData = invoices.map((inv) => ({
            invoiceDate: inv.invoiceDate,
            dueDate: new Date(inv.invoiceDate.getTime() + (vendor.paymentDueDays || 30) * 24 * 60 * 60 * 1000),
            amount: Number(inv.invoiceValue),
            vendorMsmeType: vendor.msmeType as 'MICRO' | 'SMALL' | 'MEDIUM' | undefined,
            paymentDueDays: vendor.paymentDueDays || 30,
          }));

          (enriched as any).msmePaymentSummary = getMsmePaymentSummary(invoiceData);
        }
        
        return enriched;
      })
    );

    return {
      data: vendorsWithAging,
      pagination: {
        page: filter?.page || 1,
        limit: filter?.limit || 20,
        total,
        totalPages: Math.ceil(total / (filter?.limit || 20)),
      },
    };
  }

  async getVendor(id: string, businessId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, businessId },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Add MSME payment aging if applicable
    const enriched = { ...vendor };
    
    if (vendor.msmeRegistered && vendor._count.invoices > 0) {
      const invoices = await this.prisma.gstr2bInvoice.findMany({
        where: { vendorId: vendor.id },
        orderBy: { invoiceDate: 'desc' },
        take: 50,
        select: {
          invoiceDate: true,
          invoiceValue: true,
        },
      });

      const invoiceData = invoices.map((inv) => ({
        invoiceDate: inv.invoiceDate,
        dueDate: new Date(inv.invoiceDate.getTime() + (vendor.paymentDueDays || 30) * 24 * 60 * 60 * 1000),
        amount: Number(inv.invoiceValue),
        vendorMsmeType: vendor.msmeType as 'MICRO' | 'SMALL' | 'MEDIUM' | undefined,
        paymentDueDays: vendor.paymentDueDays || 30,
      }));

      (enriched as any).msmePaymentSummary = getMsmePaymentSummary(invoiceData);
    }

    return enriched;
  }

  async updateVendor(id: string, businessId: string, dto: UpdateVendorDto) {
    const vendor = await this.getVendor(id, businessId);
    // Note: GSTIN changes would require re-verification in production

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        name: dto.name,
        tradeName: dto.tradeName,
        address: dto.address,
        state: dto.state,
        pincode: dto.pincode,
        // MSME fields
        msmeRegistered: dto.msmeRegistered,
        udyamNumber: dto.udyamNumber,
        msmeType: dto.msmeType as any,
        paymentDueDays: dto.paymentDueDays,
      },
    });

    // Audit log
    await this.logAudit(vendor.tenantId, undefined, 'vendor_updated', 'Vendor', vendor.id, {
      updatedFields: Object.keys(dto),
    });

    return updated;
  }

  async deleteVendor(id: string, businessId: string) {
    const vendor = await this.getVendor(id, businessId);

    // Check for invoices
    const invoiceCount = await this.prisma.gstr2bInvoice.count({
      where: { vendorId: id },
    });

    if (invoiceCount > 0) {
      // Soft delete - mark as blocked
      await this.prisma.vendor.update({
        where: { id },
        data: { status: 'blocked', statusReason: 'Manually blocked due to existing invoices' },
      });
    } else {
      // Hard delete
      await this.prisma.vendor.delete({ where: { id } });
    }

    return { success: true };
  }

  // ========================================
  // GSTR-2B INVOICES
  // ========================================

  async importInvoices(
    businessId: string,
    vendorId: string,
    period: string,
    invoices: any[],
  ) {
    const vendor = await this.getVendor(vendorId, businessId);

    const imported = [];

    for (const invoice of invoices) {
      // Check for duplicate
      const existing = await this.prisma.gstr2bInvoice.findUnique({
        where: {
          vendorId_invoiceNumber_period: {
            vendorId,
            invoiceNumber: invoice.invoiceNumber,
            period,
          },
        },
      });

      if (existing) {
        // Update existing record
        const updated = await this.prisma.gstr2bInvoice.update({
          where: { id: existing.id },
          data: {
            invoiceDate: new Date(invoice.invoiceDate),
            invoiceValue: invoice.invoiceValue,
            rate: invoice.rate,
            taxableValue: invoice.taxableValue,
            sgst: invoice.sgst,
            cgst: invoice.cgst,
            igst: invoice.igst,
            cess: invoice.cess,
            source: '2a_import',
            gstr2bFilingStatus: 'filed',
          },
        });
        imported.push(updated);
      } else {
        // Create new record
        const created = await this.prisma.gstr2bInvoice.create({
          data: {
            vendorId,
            businessId,
            period,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: new Date(invoice.invoiceDate),
            invoiceValue: invoice.invoiceValue,
            rate: invoice.rate,
            taxableValue: invoice.taxableValue,
            sgst: invoice.sgst,
            cgst: invoice.cgst,
            igst: invoice.igst,
            cess: invoice.cess,
            source: '2a_import',
            gstr2bFilingStatus: invoice.filingStatus || 'filed',
            matchStatus: 'matched', // Initially matched as per GSTR-2B
          },
        });
        imported.push(created);
      }
    }

    // Update vendor statistics
    await this.updateVendorStats(vendorId);

    // Audit log for invoice import
    await this.logAudit(vendor.tenantId, undefined, 'invoices_imported', 'Gstr2bInvoice', vendorId, {
      period,
      count: imported.length,
    });

    return {
      imported: imported.length,
      invoices: imported,
    };
  }

  async getVendorInvoices(vendorId: string, period?: string) {
    const where: any = { vendorId };

    if (period) {
      where.period = period;
    }

    return this.prisma.gstr2bInvoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'desc' }],
      take: 500,
    });
  }

  // ========================================
  // ITC RECONCILIATION
  // ========================================

  async runReconciliation(businessId: string, period: string, booksData?: any[]) {
    // Get all GSTR-2B invoices for the period
    const invoices = await this.prisma.gstr2bInvoice.findMany({
      where: { businessId, period },
      include: { vendor: true },
    });

    // Calculate totals
    const gstr2bTotal = invoices.reduce(
      (sum, inv) => sum + Number(inv.taxableValue || 0),
      0
    );

    // Book data reconciliation (would come from accounting system)
    const booksTotal = booksData?.reduce(
      (sum, inv) => sum + (inv.taxableValue || 0),
      0
    ) || 0;

    // Categorize
    const matched: any[] = [];
    const missing: any[] = [];
    const mismatch: any[] = [];
    const duplicate: any[] = [];

    for (const invoice of invoices) {
      const bookEntry = booksData?.find(b => b.invoiceNumber === invoice.invoiceNumber);

      if (!bookEntry) {
        // Missing in books - appears in GSTR-2B
        missing.push(invoice);
      } else if (Math.abs(Number(invoice.taxableValue) - Number(bookEntry.taxableValue)) > 100) {
        // Mismatch in values
        mismatch.push({
          gstr2b: invoice,
          book: bookEntry,
          variance: Number(invoice.taxableValue) - Number(bookEntry.taxableValue),
        });
      } else {
        matched.push(invoice);
      }
    }

    const variance = Math.abs(gstr2bTotal - booksTotal);

    // Update invoice match statuses
    for (const inv of matched) {
      await this.prisma.gstr2bInvoice.update({
        where: { id: inv.id },
        data: { matchStatus: 'matched' },
      });
    }

    for (const inv of missing) {
      await this.prisma.gstr2bInvoice.update({
        where: { id: inv.id },
        data: { matchStatus: 'missing' },
      });
    }

    // Create reconciliation record
    const reconciliation = await this.prisma.reconciliation.upsert({
      where: {
        businessId_period: { businessId, period },
      },
      update: {
        booksTotal,
        booksInvoiceCount: booksData?.length || 0,
        gstr2bTotal,
        gstr2bInvoiceCount: invoices.length,
        matchedAmount: matched.reduce((s, i) => s + Number(i.taxableValue), 0),
        missingAmount: missing.reduce((s, i) => s + Number(i.taxableValue), 0),
        mismatchAmount: mismatch.reduce((s, i) => s + Math.abs(i.variance), 0),
        varianceAmount: variance,
        matchedInvoices: matched.length,
        missingInvoices: missing.length,
        mismatchInvoices: mismatch.length,
        status: variance > 10000 ? 'requires_action' : 'completed',
        completedAt: new Date(),
      },
      create: {
        businessId,
        period,
        reconcileType: 'itc_monthly',
        booksTotal,
        booksInvoiceCount: booksData?.length || 0,
        gstr2bTotal,
        gstr2bInvoiceCount: invoices.length,
        matchedAmount: matched.reduce((s, i) => s + Number(i.taxableValue), 0),
        missingAmount: missing.reduce((s, i) => s + Number(i.taxableValue), 0),
        mismatchAmount: mismatch.reduce((s, i) => s + Math.abs(i.variance), 0),
        varianceAmount: variance,
        matchedInvoices: matched.length,
        missingInvoices: missing.length,
        mismatchInvoices: mismatch.length,
        status: variance > 10000 ? 'requires_action' : 'completed',
        completedAt: new Date(),
      },
    });

    return reconciliation;
  }

  async getReconciliation(businessId: string, period?: string) {
    const where: any = { businessId };
    if (period) {
      where.period = period;
    }

    return this.prisma.reconciliation.findMany({
      where,
      orderBy: [{ period: 'desc' }],
    });
  }

  // ========================================
  // DASHBOARD
  // ========================================

  async getDashboard(tenantId: string, businessId: string) {
    const [
      vendors,
      recentReconciliation,
      itcExposure,
      openNotices,
      upcomingReturns,
      vendorsWithoutGstin,
    ] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { tenantId, businessId },
        select: {
          riskLevel: true,
          complianceScore: true,
          itcAtRisk: true,
          gstin: true,
          msmeRegistered: true,
          msmeType: true,
        },
      }),
      this.prisma.reconciliation.findFirst({
        where: { businessId },
        orderBy: { period: 'desc' },
      }),
      this.prisma.vendor.aggregate({
        where: { tenantId, businessId },
        _sum: { itcAtRisk: true, itcClaimed: true, itcBlocked: true },
        _count: true,
      }),
      this.prisma.notice.count({
        where: { businessId, status: 'RECEIVED' },
      }),
      // Get upcoming GSTR-1/3B due within 7 days
      this.prisma.gstReturn.findMany({
        where: {
          businessId,
          status: 'not_filed',
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        take: 5,
      }),
      this.prisma.vendor.count({
        where: { tenantId, businessId, gstin: null },
      }),
    ]);

    // Count overdue MSME invoices (simplified - in production would be more detailed)
    const overdueMsmeCount = vendors.filter(v => 
      v.msmeRegistered && 
      (v.riskLevel === 'critical' || v.riskLevel === 'high_risk')
    ).length;

    // Risk distribution
    const byRisk = {
      critical: vendors.filter(v => v.riskLevel === 'critical').length,
      high: vendors.filter(v => v.riskLevel === 'high_risk').length,
      medium: vendors.filter(v => v.riskLevel === 'medium_risk').length,
      low: vendors.filter(v => v.riskLevel === 'low_risk').length,
      trusted: vendors.filter(v => v.riskLevel === 'trusted').length,
    };

    // Average score
    const avgScore = vendors.length > 0
      ? vendors.reduce((sum, v) => sum + v.complianceScore, 0) / vendors.length
      : 0;

    return {
      totalVendors: itcExposure._count,
      byRisk,
      averageScore: Math.round(avgScore),
      itcExposure: {
        claimed: itcExposure._sum.itcClaimed || 0,
        atRisk: itcExposure._sum.itcAtRisk || 0,
        blocked: itcExposure._sum.itcBlocked || 0,
      },
      lastReconciliation: recentReconciliation,
      complianceRisks: {
        overdueMsmeInvoices: overdueMsmeCount,
        vendorsMissingGstin: vendorsWithoutGstin,
        openGstNotices: openNotices,
        upcomingGstReturns: upcomingReturns.length,
        upcomingReturnsList: upcomingReturns.map(r => ({
          formType: r.formType,
          dueDate: r.dueDate,
          taxPeriod: r.taxPeriod,
        })),
      },
    };
  }

  // ========================================
  // PRIVATE
  // ========================================

  private async updateVendorStats(vendorId: string) {
    const invoices = await this.prisma.gstr2bInvoice.findMany({
      where: { vendorId },
    });

    const totalInvoices = invoices.length;
    const matched = invoices.filter(i => i.matchStatus === 'matched').length;
    const missingCount = invoices.filter(i => i.matchStatus === 'missing').length;
    const unmatched = invoices.filter(i => i.matchStatus === 'mismatch').length;

    const itcClaimed = invoices.reduce(
      (sum, i) => sum + Number(i.itcClaimed || 0),
      0
    );

    // Calculate risk score
    const riskScore = calculateVendorRisk({
      totalInvoices,
      matched,
      missing: missingCount,
      lastGstr1Filed: undefined, // Would come from vendor sync
    });

    // Calculate risk level
    const riskLevel = calculateRiskLevel(itcClaimed, missingCount, riskScore);

    // Calculate ITC at risk
    const itcAtRisk = invoices.filter(i => i.matchStatus === 'missing').reduce(
      (sum, i) => sum + Number(i.taxableValue || 0) * 0.18, // Assumed 18% average
      0
    );

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        totalInvoices,
        matchedInvoices: matched,
        missingInvoices: missingCount,
        itcClaimed,
        itcAtRisk,
        complianceScore: riskScore,
        riskLevel: riskLevel as any,
        lastSeenAt: new Date(),
      },
    });
  }

  private async logAudit(
    tenantId: string,
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    values: any,
    
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        
        newValues: values,
      },
    }).catch(() => {});
  }
}