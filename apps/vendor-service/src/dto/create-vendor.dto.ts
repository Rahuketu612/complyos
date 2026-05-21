import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ example: '07AABCT1349F1Z3' })
  @IsString()
  gstin: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'INV-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty()
  @IsString()
  invoiceDate: string;

  @ApiProperty()
  @IsNumber()
  invoiceValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxableValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sgst?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cgst?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  igst?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cess?: number;
}

export class VendorFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['trusted', 'low_risk', 'medium_risk', 'high_risk', 'critical'])
  riskLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['active', 'inactive', 'blocked'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}