import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';

enum GstrFormType {
  GSTR_1 = 'GSTR_1',
  GSTR_3B = 'GSTR_3B',
  GSTR_4 = 'GSTR_4',
  GSTR_5 = 'GSTR_5',
  GSTR_6 = 'GSTR_6',
  GSTR_7 = 'GSTR_7',
  GSTR_9 = 'GSTR_9',
  GSTR_9C = 'GSTR_9C',
}

enum FilingStatus {
  filed = 'filed',
  not_filed = 'not_filed',
  pending = 'pending',
  processing = 'processing',
}

export class CreateReturnDto {
  @ApiProperty({ example: '2024-04' })
  @IsString()
  taxPeriod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financialYear?: string;

  @ApiPropertyOptional({ enum: GstrFormType })
  @IsOptional()
  @IsEnum(GstrFormType)
  formType?: string;

  @ApiPropertyOptional({ enum: FilingStatus })
  @IsOptional()
  @IsEnum(FilingStatus)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  filedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ackNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalLiability?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPaid?: number;
}

export class ReturnFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financialYear?: string;
}

export class NoticeFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}