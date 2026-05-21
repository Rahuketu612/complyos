import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessService } from '../services/business.service';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { BusinessFilterDto } from '../dto/business-filter.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get('health')
  health() {
    return { status: 'healthy', service: 'business', timestamp: new Date().toISOString() };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new business' })
  @ApiResponse({ status: 201, description: 'Business created' })
  @ApiResponse({ status: 409, description: 'Business with this PAN exists' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessService.create(user.tenantId, dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all businesses' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filter: BusinessFilterDto,
  ) {
    return this.businessService.findAll(user.tenantId, filter);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get compliance dashboard overview' })
  async getDashboard(
    @CurrentUser() user: any,
    @Query('businessId') businessId?: string,
  ) {
    return this.businessService.getDashboard(user.tenantId, businessId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.findOne(id, user.tenantId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get business summary' })
  async getSummary(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.getBusinessSummary(id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateBusinessDto>,
  ) {
    return this.businessService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive business' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.businessService.delete(id, user.tenantId);
  }
}