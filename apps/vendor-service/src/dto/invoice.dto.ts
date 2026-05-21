import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceLineItem {
  @ApiProperty()
  @IsString()
  hsnCode!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  rate!: number;

  @ApiProperty()
  @IsNumber()
  taxAmount!: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  invoiceNumber!: string;

  @ApiProperty()
  @IsString()
  vendorGstin!: string;

  @ApiProperty()
  @IsString()
  invoiceDate!: string;

  @ApiProperty()
  @IsNumber()
  totalValue!: number;

  @ApiProperty()
  @IsNumber()
  taxValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  lineItems?: InvoiceLineItem[];
}