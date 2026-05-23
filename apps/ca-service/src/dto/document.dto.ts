import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  originalName: string;

  @ApiProperty()
  @IsString()
  fileType: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsString()
  size: number;

  @ApiProperty({ enum: ['GST_NOTICE', 'INVOICE', 'CHALLAN', 'ROC_FILING', 'TAX_DOCUMENT', 'BANK_STATEMENT', 'ANNUAL_RETURN', 'PROFIT_LOSS', 'BALANCE_SHEET', 'OTHER'] })
  @IsEnum(['GST_NOTICE', 'INVOICE', 'CHALLAN', 'ROC_FILING', 'TAX_DOCUMENT', 'BANK_STATEMENT', 'ANNUAL_RETURN', 'PROFIT_LOSS', 'BALANCE_SHEET', 'OTHER'])
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  retentionCategory?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;
}

export class DocumentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}