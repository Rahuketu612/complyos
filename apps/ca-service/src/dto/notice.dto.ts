import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoticeDto {
  @ApiProperty()
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noticeNumber?: string;

  @ApiPropertyOptional({ enum: ['GST_SCRUTINY', 'GST_DEMAND', 'GST_ASSESSMENT', 'GST_PENALTY', 'GST_REFUND', 'GST_ARC', 'INCOME_TAX_SCRUTINY', 'INCOME_TAX_ASSESSMENT', 'INCOME_TAX_DEMAND', 'INCOME_TAX_PENALTY', 'TDS_DEFAULT', 'ROC_NON_COMPLIANCE', 'EPFO_DEMAND', 'ESIC_DEMAND', 'OTHER'] })
  @IsOptional()
  @IsEnum(['GST_SCRUTINY', 'GST_DEMAND', 'GST_ASSESSMENT', 'GST_PENALTY', 'GST_REFUND', 'GST_ARC', 'INCOME_TAX_SCRUTINY', 'INCOME_TAX_ASSESSMENT', 'INCOME_TAX_DEMAND', 'INCOME_TAX_PENALTY', 'TDS_DEFAULT', 'ROC_NON_COMPLIANCE', 'EPFO_DEMAND', 'ESIC_DEMAND', 'OTHER'])
  noticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentYear?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @ApiPropertyOptional({ enum: ['RECEIVED', 'UNDER_REVIEW', 'CLIENT_PENDING', 'DRAFT_PREPARED', 'RESPONSE_FILED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['RECEIVED', 'UNDER_REVIEW', 'CLIENT_PENDING', 'DRAFT_PREPARED', 'RESPONSE_FILED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  responseDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  demandAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number;

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groundsOfNotice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class UpdateNoticeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noticeNumber?: string;

  @ApiPropertyOptional({ enum: ['GST_SCRUTINY', 'GST_DEMAND', 'GST_ASSESSMENT', 'GST_PENALTY', 'GST_REFUND', 'GST_ARC', 'INCOME_TAX_SCRUTINY', 'INCOME_TAX_ASSESSMENT', 'INCOME_TAX_DEMAND', 'INCOME_TAX_PENALTY', 'TDS_DEFAULT', 'ROC_NON_COMPLIANCE', 'EPFO_DEMAND', 'ESIC_DEMAND', 'OTHER'] })
  @IsOptional()
  @IsEnum(['GST_SCRUTINY', 'GST_DEMAND', 'GST_ASSESSMENT', 'GST_PENALTY', 'GST_REFUND', 'GST_ARC', 'INCOME_TAX_SCRUTINY', 'INCOME_TAX_ASSESSMENT', 'INCOME_TAX_DEMAND', 'INCOME_TAX_PENALTY', 'TDS_DEFAULT', 'ROC_NON_COMPLIANCE', 'EPFO_DEMAND', 'ESIC_DEMAND', 'OTHER'])
  noticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentYear?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @ApiPropertyOptional({ enum: ['RECEIVED', 'UNDER_REVIEW', 'CLIENT_PENDING', 'DRAFT_PREPARED', 'RESPONSE_FILED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['RECEIVED', 'UNDER_REVIEW', 'CLIENT_PENDING', 'DRAFT_PREPARED', 'RESPONSE_FILED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  responseDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  demandAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groundsOfNotice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class NoticeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noticeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class AddNoticeCommentDto {
  @ApiProperty()
  @IsString()
  comment!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class LinkDocumentDto {
  @ApiProperty()
  @IsString()
  documentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTaskFromNoticeDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;
}