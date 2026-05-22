import { Controller, Get, Post, Param, Body, Query, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto, VendorFilterDto } from '../dto/create-vendor.dto';
import { CreateInvoiceDto } from '../dto/invoice.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Vendors')
@Controller(':businessId/vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private vendorService: VendorService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @Header('Cache-Control', 'no-cache')
  async health() {
    return { status: 'healthy', service: 'vendor', timestamp: new Date().toISOString() };
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({ summary: 'Create vendor' })
  async create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorService.createVendor(user.tenantId, businessId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  async findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Query() filter: VendorFilterDto,
  ) {
    return this.vendorService.findVendors(user.tenantId, businessId, filter);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get vendor dashboard' })
  async getDashboard(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.vendorService.getDashboard(user.tenantId, businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  async get(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.vendorService.getVendor(id, businessId);
  }

  @Post(':id/invoices')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({ summary: 'Import GSTR-2B invoices' })
  async importInvoices(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() body: { period: string; invoices: CreateInvoiceDto[] },
  ) {
    return this.vendorService.importInvoices(
      businessId,
      id,
      body.period,
      body.invoices,
    );
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get vendor invoices' })
  async getInvoices(
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.vendorService.getVendorInvoices(id, period);
  }

  @Post('reconciliation')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute (expensive operation)
  @ApiOperation({ summary: 'RunITC reconciliation' })
  async reconcile(
    @Param('businessId') businessId: string,
    @Body() body: { period: string; books?: any[] },
  ) {
    return this.vendorService.runReconciliation(
      businessId,
      body.period,
      body.books,
    );
  }

  @Get('reconciliation')
  @ApiOperation({ summary: 'Get reconciliation history' })
  async getReconciliation(
    @Param('businessId') businessId: string,
    @Query('period') period?: string,
  ) {
    return this.vendorService.getReconciliation(businessId, period);
  }
}