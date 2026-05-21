import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, VendorFilterDto } from '../dto/create-vendor.dto';
import { calculateVendorRisk, calculateRiskLevel } from '../utils/risk-calculation';

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

  async createVendor(tenantId: string, businessId: string, dto: CreateVendorDto) {
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
        entityType: dto.entityType,
        riskLevel: 'low_risk',
        complianceScore: 75, // Default score
      },
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
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
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

    return vendor;
  }

  async updateVendor(id: string, businessId: string, dto: Partial<CreateVendorDto>) {
    const vendor = await this.getVendor(id, businessId);
    // Note: GSTIN changes would require re-verification in production

    return this.prisma.vendor.update({
      where: { id },
      data: dto,
    });
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
    const [vendors, recentReconciliation, itcExposure] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { tenantId, businessId },
        select: {
          riskLevel: true,
          complianceScore: true,
          itcAtRisk: true,
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
    ]);

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
    const missing = invoices.filter(i => i.matchStatus === 'missing').length;
    const unmatched = invoices.filter(i => i.matchStatus === 'mismatch').length;

    const itcClaimed = invoices.reduce(
      (sum, i) => sum + Number(i.itcClaimed || 0),
      0
    );

    // Calculate risk score
    const riskScore = calculateVendorRisk({
      totalInvoices,
      matched,
      missing,
      lastGstr1Filed: undefined, // Would come from vendor sync
    });

    // Calculate risk level
    const riskLevel = calculateRiskLevel(itcClaimed, missing, riskScore);

    // Calculate ITC at risk
    const itcAtRisk = missing.reduce(
      (sum, i) => sum + Number(i.taxableValue || 0) * 0.18, // Assumed 18% average
      0
    );

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        totalInvoices,
        matchedInvoices: matched,
        missingInvoices: missing,
        itcClaimed,
        itcAtRisk,
        complianceScore: riskScore,
        riskLevel: riskLevel as any,
        lastSeenAt: new Date(),
      },
    });
  }
}