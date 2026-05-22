import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Matches } from 'class-validator';

// MSME type enum matching Prisma schema
export enum MsmeTypeEnum {
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
}

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

  // MSME fields
  @ApiPropertyOptional({ description: 'Whether vendor is MSME registered' })
  @IsOptional()
  @IsBoolean()
  msmeRegistered?: boolean;

  @ApiPropertyOptional({ description: 'Udyam Registration Number', example: 'UDYAM-UP-01-0000001' })
  @IsOptional()
  @IsString()
  @Matches(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, { 
    message: 'Invalid Udyam number format. Expected: UDYAM-XX-00-0000000' 
  })
  udyamNumber?: string;

  @ApiPropertyOptional({ description: 'MSME enterprise type', enum: MsmeTypeEnum })
  @IsOptional()
  @IsEnum(MsmeTypeEnum)
  msmeType?: MsmeTypeEnum;

  @ApiPropertyOptional({ description: 'Payment terms in days', default: 30 })
  @IsOptional()
  @IsNumber()
  paymentDueDays?: number;
}

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradeName?: string;

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

  // MSME fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  msmeRegistered?: boolean;

  @ApiPropertyOptional({ example: 'UDYAM-UP-01-0000001' })
  @IsOptional()
  @IsString()
  @Matches(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, { 
    message: 'Invalid Udyam number format. Expected: UDYAM-XX-00-0000000' 
  })
  udyamNumber?: string;

  @ApiPropertyOptional({ enum: MsmeTypeEnum })
  @IsOptional()
  @IsEnum(MsmeTypeEnum)
  msmeType?: MsmeTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paymentDueDays?: number;
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